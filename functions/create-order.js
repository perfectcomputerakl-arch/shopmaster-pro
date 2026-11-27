// ShopMaster Pro - Secure Razorpay Order Creation
// Cloudflare Pages Function

const PLANS = {
  pro_monthly: {
    label: "Monthly Pro (30 Days)",
    amount: 9900,
    duration: 30
  },
  pro_yearly: {
    label: "Yearly Pro (365 Days)",
    amount: 99900,
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

export async function onRequestPost({ request, env }) {
  try {
    // Check required configuration
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

    // Authenticate user
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

    if (!user.id) {
      return json({ error: "User authentication failed" }, 401);
    }

    // Validate requested plan
    const body = await request.json();
    const plan = PLANS[body.plan];

    if (!plan) {
      return json({ error: "Invalid Pro plan selected" }, 400);
    }

    // Create Razorpay order using server-side fixed price
    const credentials = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const orderResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: plan.amount,
          currency: "INR",
          receipt: `sm_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
          notes: {
            owner_id: user.id,
            plan_key: body.plan
          }
        })
      }
    );

    const order = await orderResponse.json();

    if (!orderResponse.ok || !order.id) {
      return json({
        error: order.error?.description || "Razorpay order creation failed"
      }, 502);
    }

    // Save order in Supabase
    const dbResponse = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/payment_transactions`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          owner_id: user.id,
          razorpay_order_id: order.id,
          plan_key: body.plan,
          amount_paise: plan.amount,
          currency: "INR",
          status: "created"
        })
      }
    );

    if (!dbResponse.ok) {
      return json({
        error: "Payment record save nahi hua. Please try again."
      }, 500);
    }

    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      label: plan.label
    });

  } catch (error) {
    return json({
      error: error.message || "Server error"
    }, 500);
  }
      }
