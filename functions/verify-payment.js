// ShopMaster Pro - Razorpay Payment Verification
// Cloudflare Pages Function

const PLANS = {
  pro_monthly: {
    duration: 30
  },
  pro_yearly: {
    duration: 365
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function hmacSHA256(secret, message) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

export async function onRequestPost({ request, env }) {
  try {
    const required = [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY"
    ];

    for (const key of required) {
      if (!env[key]) {
        return json({ error: `Server configuration missing: ${key}` }, 500);
      }
    }

    // Authenticate logged-in user
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return json({ error: "Please login first" }, 401);
    }

    const authResponse = await fetch(
      `${env.VITE_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!authResponse.ok) {
      return json({ error: "Invalid login session" }, 401);
    }

    const user = await authResponse.json();

    // Payment details
    const body = await request.json();

    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return json({ error: "Payment details incomplete" }, 400);
    }

    // Verify Razorpay signature
    const expectedSignature = await hmacSHA256(
      env.RAZORPAY_KEY_SECRET,
      `${orderId}|${paymentId}`
    );

    if (!safeEqual(expectedSignature, signature)) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const serviceHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    };

    const base = env.VITE_SUPABASE_URL;

    // Find payment record belonging to this user
    const recordResponse = await fetch(
      `${base}/rest/v1/payment_transactions?razorpay_order_id=eq.${encodeURIComponent(orderId)}&owner_id=eq.${user.id}&select=*`,
      { headers: serviceHeaders }
    );

    const records = await recordResponse.json();

    if (!recordResponse.ok || !records.length) {
      return json({ error: "Payment order not found" }, 404);
    }

    const record = records[0];

    if (record.status === "paid") {
      return json({
        success: true,
        message: "Payment already verified"
      });
    }

    const plan = PLANS[record.plan_key];

    if (!plan) {
      return json({ error: "Invalid plan" }, 400);
    }

    // Confirm payment directly with Razorpay
    const credentials = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      }
    );

    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return json({ error: "Unable to verify Razorpay payment" }, 502);
    }

    if (
      payment.order_id !== orderId ||
      payment.amount !== record.amount_paise ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return json({
        error: "Payment amount, order or capture status mismatch"
      }, 400);
    }

    // Check that this payment ID is not already used
    const duplicateResponse = await fetch(
      `${base}/rest/v1/payment_transactions?razorpay_payment_id=eq.${encodeURIComponent(paymentId)}&select=id`,
      { headers: serviceHeaders }
    );

    const duplicates = await duplicateResponse.json();

    if (duplicates.length && duplicates[0].id !== record.id) {
      return json({ error: "Payment already used" }, 409);
    }

    // Read existing subscription without deleting or replacing it
    const subResponse = await fetch(
      `${base}/rest/v1/subscriptions?owner_id=eq.${user.id}&select=owner_id,plan,status,starts_at,expires_at,trial_used`,
      { headers: serviceHeaders }
    );

    const subscriptions = await subResponse.json();

    if (!subResponse.ok || !subscriptions.length) {
      return json({ error: "Existing subscription record not found" }, 500);
    }

    const currentSub = subscriptions[0];

    const now = new Date();

    let startDate = now;

    if (
      currentSub.expires_at &&
      new Date(currentSub.expires_at) > now &&
      ["active", "trial"].includes(currentSub.status)
    ) {
      startDate = new Date(currentSub.expires_at);
    }

    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.duration);

    // Update only subscription fields required for Pro activation
    const updateSubResponse = await fetch(
      `${base}/rest/v1/subscriptions?owner_id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          ...serviceHeaders,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          plan: "pro",
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiryDate.toISOString(),
          provider: "razorpay",
          updated_at: now.toISOString()
        })
      }
    );

    const updatedSubs = await updateSubResponse.json();

    if (!updateSubResponse.ok || !updatedSubs.length) {
      return json({ error: "Subscription activation failed" }, 500);
    }

    // Mark payment record as paid
    const updatePaymentResponse = await fetch(
      `${base}/rest/v1/payment_transactions?id=eq.${record.id}&status=eq.created`,
      {
        method: "PATCH",
        headers: {
          ...serviceHeaders,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          status: "paid",
          razorpay_signature_verified: true,
          verified_at: now.toISOString(),
          updated_at: now.toISOString()
        })
      }
    );

    if (!updatePaymentResponse.ok) {
      return json({
        error: "Payment received, but payment record update failed. Contact support."
      }, 500);
    }

    return json({
      success: true,
      message: "ShopMaster Pro activated successfully!",
      plan: record.plan_key,
      expires_at: expiryDate.toISOString()
    });

  } catch (error) {
    return json({
      error: error.message || "Payment verification failed"
    }, 500);
  }
      }
