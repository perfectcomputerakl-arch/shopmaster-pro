const PLANS = {
  pro_monthly: {
    amount: 9900,
    days: 30,
  },
  pro_yearly: {
    amount: 99900,
    days: 365,
  },
};

export async function onRequestPost({ request, env }) {
  try {
    // 1. Get user authentication
    const auth = request.headers.get("Authorization");

    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Please login first." }, 401);
    }

    const token = auth.substring(7);

    // 2. Verify Supabase user
    const userResponse = await fetch(
      `${env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!userResponse.ok) {
      return json({ error: "Invalid login session." }, 401);
    }

    const user = await userResponse.json();

    // 3. Get payment details
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return json({ error: "Payment details missing." }, 400);
    }

    // 4. Find transaction
    const dbHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const transactionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_transactions?owner_id=eq.${user.id}&razorpay_order_id=eq.${encodeURIComponent(razorpay_order_id)}&select=*`,
      { headers: dbHeaders }
    );

    const transactions = await transactionResponse.json();

    if (!transactionResponse.ok || !transactions.length) {
      return json({ error: "Transaction not found." }, 404);
    }

    const transaction = transactions[0];

    // 5. Check duplicate payment
    if (transaction.status === "paid") {
      if (transaction.razorpay_payment_id !== razorpay_payment_id) {
        return json({ error: "Transaction already processed." }, 409);
      }

      return json({
        success: true,
        verified: true,
        message: "Payment already verified.",
      });
    }

    // 6. Validate plan and amount
    const plan = PLANS[transaction.plan_key];

    if (
      !plan ||
      transaction.amount_paise !== plan.amount ||
      transaction.currency !== "INR"
    ) {
      return json({ error: "Invalid payment amount or plan." }, 400);
    }

    // 7. Verify Razorpay signature
    const encoder = new TextEncoder();

    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
    );

    const expectedSignature = Array.from(
      new Uint8Array(signatureBuffer)
    )
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (
      expectedSignature.length !== razorpay_signature.length ||
      !timingSafeEqual(expectedSignature, razorpay_signature)
    ) {
      return json({ error: "Payment signature verification failed." }, 400);
    }

    // 8. Verify payment directly with Razorpay
    const credentials = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return json({ error: "Unable to verify Razorpay payment." }, 502);
    }

    if (
      payment.id !== razorpay_payment_id ||
      payment.order_id !== razorpay_order_id ||
      payment.amount !== plan.amount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return json({
        error: "Payment is not captured or payment details do not match.",
      }, 400);
    }

    // 9. Get existing subscription
    const subResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?owner_id=eq.${user.id}&select=*`,
      { headers: dbHeaders }
    );

    if (!subResponse.ok) {
      return json({ error: "Subscription lookup failed." }, 500);
    }

    const subscriptions = await subResponse.json();
    const existing = subscriptions[0];

    const now = new Date();

    let startDate = now;

    // Extend existing active/trial subscription
    if (
      existing &&
      ["active", "trial"].includes(existing.status) &&
      existing.expires_at &&
      new Date(existing.expires_at) > now
    ) {
      startDate = new Date(existing.expires_at);
    }

    const expiryDate = new Date(startDate);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + plan.days);

    const nowISO = now.toISOString();

    // 10. Activate PRO subscription
    const subscriptionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?on_conflict=owner_id`,
      {
        method: "POST",
        headers: {
          ...dbHeaders,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          owner_id: user.id,
          plan: "pro",
          status: "active",
          starts_at: existing?.starts_at || nowISO,
          expires_at: expiryDate.toISOString(),
          trial_used: true,
          provider: "razorpay",
          provider_customer_id: user.id,
          provider_subscription_id: razorpay_payment_id,
          updated_at: nowISO,
        }),
      }
    );

    if (!subscriptionResponse.ok) {
      return json({
        error: "Payment verified, but subscription activation failed.",
        payment_verified: true,
      }, 500);
    }

    // 11. Mark transaction as paid
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_transactions?owner_id=eq.${user.id}&razorpay_order_id=eq.${encodeURIComponent(razorpay_order_id)}&status=eq.created`,
      {
        method: "PATCH",
        headers: {
          ...dbHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          razorpay_payment_id,
          razorpay_signature_verified: true,
          status: "paid",
          verified_at: nowISO,
          updated_at: nowISO,
        }),
      }
    );

    if (!updateResponse.ok) {
      return json({
        error: "Subscription activated, but transaction update failed.",
        payment_verified: true,
      }, 500);
    }

    const updatedTransactions = await updateResponse.json();

    if (!updatedTransactions.length) {
      return json({
        error: "Transaction was not updated. Please contact support.",
        payment_verified: true,
      }, 500);
    }

    // 12. Success
    return json({
      success: true,
      verified: true,
      subscription: {
        plan: "pro",
        status: "active",
        expires_at: expiryDate.toISOString(),
      },
    });

  } catch (error) {
    return json({
      error: error.message || "Internal server error.",
    }, 500);
  }
}

function timingSafeEqual(a, b) {
  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
