export async function onRequestPost({ request, env }) {
  try {
    // 1. Read raw webhook body
    const rawBody = await request.text();

    const signature = request.headers.get(
      "X-Razorpay-Signature"
    );

    if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) {
      return json({ error: "Webhook configuration missing." }, 400);
    }

    // 2. Verify webhook signature
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.RAZORPAY_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );

    const expected = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (!safeEqual(expected, signature)) {
      return json({ error: "Invalid webhook signature." }, 401);
    }

    // 3. Parse event
    const event = JSON.parse(rawBody);

    if (!["payment.captured", "payment.failed"].includes(event.event)) {
      return json({ success: true, ignored: true });
    }

    const payment = event.payload?.payment?.entity;

    if (!payment?.order_id || !payment?.id) {
      return json({ error: "Invalid payment payload." }, 400);
    }

    // 4. Supabase configuration
    const base = env.SUPABASE_URL;
    const secret = env.SUPABASE_SERVICE_ROLE_KEY;

    const headers = {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    };

    // 5. Find transaction
    const lookup = await fetch(
      `${base}/rest/v1/payment_transactions?razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}&select=*`,
      { headers }
    );

    if (!lookup.ok) {
      return json({ error: "Database lookup failed." }, 500);
    }

    const rows = await lookup.json();

    if (!rows.length) {
      return json({ error: "Transaction not found." }, 404);
    }

    const tx = rows[0];

    // 6. Already processed
    if (tx.status === "paid") {
      return json({ success: true, duplicate: true });
    }

    if (tx.status !== "created") {
      return json({ success: true, ignored: true });
    }

    // 7. Validate payment amount
    if (
      payment.amount !== tx.amount_paise ||
      payment.currency !== "INR"
    ) {
      return json({ error: "Payment amount mismatch." }, 400);
    }

    const now = new Date();

    // 8. Failed payment
    if (event.event === "payment.failed") {
      const failed = await fetch(
        `${base}/rest/v1/payment_transactions?razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}&status=eq.created`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "failed",
            razorpay_payment_id: payment.id,
            updated_at: now.toISOString(),
          }),
        }
      );

      if (!failed.ok) {
        return json({ error: "Failed payment update error." }, 500);
      }

      return json({ success: true, payment_status: "failed" });
    }

    // 9. Confirm captured payment
    if (payment.status !== "captured") {
      return json({ error: "Payment not captured." }, 400);
    }

    const plans = {
      pro_monthly: 30,
      pro_yearly: 365,
    };

    const days = plans[tx.plan_key];

    if (!days) {
      return json({ error: "Invalid subscription plan." }, 400);
    }

    // 10. Find existing subscription
    const subLookup = await fetch(
      `${base}/rest/v1/subscriptions?owner_id=eq.${tx.owner_id}&select=*`,
      { headers }
    );

    if (!subLookup.ok) {
      return json({ error: "Subscription lookup failed." }, 500);
    }

    const subs = await subLookup.json();
    const existing = subs[0];

    let start = now;

    if (
      existing &&
      ["active", "trial"].includes(existing.status) &&
      existing.expires_at &&
      new Date(existing.expires_at) > now
    ) {
      start = new Date(existing.expires_at);
    }

    const expiry = new Date(start);
    expiry.setUTCDate(expiry.getUTCDate() + days);

    // 11. Activate PRO subscription
    const activation = await fetch(
      `${base}/rest/v1/subscriptions?on_conflict=owner_id`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          owner_id: tx.owner_id,
          plan: "pro",
          status: "active",
          starts_at: existing?.starts_at || now.toISOString(),
          expires_at: expiry.toISOString(),
          trial_used: true,
          provider: "razorpay",
          provider_customer_id: tx.owner_id,
          provider_subscription_id: payment.id,
          updated_at: now.toISOString(),
        }),
      }
    );

    if (!activation.ok) {
      return json({ error: "PRO activation failed." }, 500);
    }

    // 12. Mark transaction paid
    const update = await fetch(
      `${base}/rest/v1/payment_transactions?razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}&status=eq.created`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "paid",
          razorpay_payment_id: payment.id,
          razorpay_signature_verified: true,
          verified_at: now.toISOString(),
          updated_at: now.toISOString(),
        }),
      }
    );

    if (!update.ok) {
      return json({ error: "Transaction update failed." }, 500);
    }

    return json({
      success: true,
      payment_status: "paid",
      subscription: "active",
      expires_at: expiry.toISOString(),
    });

  } catch (error) {
    return json({
      error: error.message || "Webhook processing failed.",
    }, 500);
  }
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;

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
