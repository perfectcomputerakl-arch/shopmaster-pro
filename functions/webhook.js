// ShopMaster Pro - Razorpay Webhook
// Cloudflare Pages Function

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function createHmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

export async function onRequestPost({ request, env }) {
  try {
    if (
      !env.RAZORPAY_WEBHOOK_SECRET ||
      !env.SUPABASE_SERVICE_ROLE_KEY ||
      !env.VITE_SUPABASE_URL
    ) {
      return json({ error: "Webhook configuration missing" }, 500);
    }

    // Read original raw body for signature verification
    const rawBody = await request.text();

    const receivedSignature =
      request.headers.get("x-razorpay-signature") || "";

    const expectedSignature = await createHmac(
      env.RAZORPAY_WEBHOOK_SECRET,
      rawBody
    );

    if (!safeEqual(expectedSignature, receivedSignature)) {
      return json({ error: "Invalid webhook signature" }, 401);
    }

    const eventId =
      request.headers.get("x-razorpay-event-id");

    if (!eventId) {
      return json({ error: "Webhook event ID missing" }, 400);
    }

    const event = JSON.parse(rawBody);

    if (!event.event) {
      return json({ error: "Invalid webhook event" }, 400);
    }

    const base = env.VITE_SUPABASE_URL;

    const response = await fetch(
      `${base}/rest/v1/payment_webhook_events`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal"
        },
        body: JSON.stringify({
          event_id: eventId,
          event_type: event.event,
          status: "processed",
          processed_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      return json({
        error: "Webhook event could not be saved"
      }, 500);
    }

    return json({
      received: true,
      message: "Webhook signature verified and event recorded"
    });

  } catch (error) {
    return json({
      error: error.message || "Webhook processing failed"
    }, 500);
  }
}
