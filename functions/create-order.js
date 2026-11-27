const PLANS = {
  pro_monthly: {
    name: "PRO Monthly",
    amount: 9900,
    days: 30,
  },
  pro_yearly: {
    name: "PRO Yearly",
    amount: 99900,
    days: 365,
  },
};

export async function onRequestPost({ request, env }) {
  try {
    // 1. Authentication
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Please login first." }, 401);
    }

    const token = authHeader.substring(7);

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
      return json({ error: "Invalid session. Please login again." }, 401);
    }

    const user = await userResponse.json();

    if (!user.id) {
      return json({ error: "User authentication failed." }, 401);
    }

    // 3. Get requested plan
    const body = await request.json();
    const planKey = body.plan_key;

    const plan = PLANS[planKey];

    if (!plan) {
      return json({ error: "Invalid or unavailable plan." }, 400);
    }

    // 4. Check configuration
    if (
      !env.RAZORPAY_KEY_ID ||
      !env.RAZORPAY_KEY_SECRET ||
      !env.SUPABASE_URL ||
      !env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return json({ error: "Payment configuration missing." }, 500);
    }

    // 5. Create Razorpay order
    const credentials = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const orderResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: plan.amount,
          currency: "INR",
          receipt: `sm_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`,
          notes: {
            user_id: user.id,
            plan_key: planKey,
            plan_name: plan.name,
          },
        }),
      }
    );

    const order = await orderResponse.json();

    if (!orderResponse.ok || !order.id) {
      return json({
        error: order.error?.description || "Razorpay order creation failed.",
      }, 502);
    }

    // 6. Save transaction in Supabase
    const dbResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_transactions`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          owner_id: user.id,
          razorpay_order_id: order.id,
          plan_key: planKey,
          amount_paise: plan.amount,
          status: "created",
          razorpay_signature_verified: false,
        }),
      }
    );

    if (!dbResponse.ok) {
      return json({
        error: "Transaction database error. Please contact support.",
      }, 500);
    }

    // 7. Return order details
    return json({
      success: true,
      key_id: env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: plan.amount,
      currency: "INR",
      plan_key: planKey,
      plan_name: plan.name,
      days: plan.days,
    });

  } catch (error) {
    return json({
      error: error.message || "Internal server error.",
    }, 500);
  }
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
