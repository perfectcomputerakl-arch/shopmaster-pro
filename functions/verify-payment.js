// ShopMaster Pro - Secure Razorpay Payment Verification

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
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    a.length !== b.length
  ) return false;

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
        return json({ error: `Missing configuration: ${key}` }, 500);
      }
    }

    // Authenticate user
    const token = (
      request.headers.get("Authorization") || ""
    ).replace(/^Bearer\s+/i, "");

    if (!token) {
      return json({ error: "Please login first" }, 401);
    }

    const base = env.VITE_SUPABASE_URL;

    const authResponse = await fetch(
      `${base}/auth/v1/user`,
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
    const expected = await hmacSHA256(
      env.RAZORPAY_KEY_SECRET,
      `${orderId}|${paymentId}`
    );

    if (!safeEqual(expected, signature)) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const serviceHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    };

    // Find this user's payment order
    const recordResponse = await fetch(
      `${base}/rest/v1/payment_transactions?razorpay_order_id=eq.${encodeURIComponent(orderId)}&owner_id=
