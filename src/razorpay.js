// ShopMaster Pro - Razorpay Configuration

export const RAZORPAY_KEY_ID = "rzp_test_xxxxxxxxxxxxx";

// Razorpay Payment Configuration
export const RAZORPAY_CONFIG = {
    currency: "INR",
    name: "ShopMaster Pro",
    description: "ShopMaster Pro Subscription",
    theme: {
        color: "#10B981"
    }
};

// Subscription Plans
export const RAZORPAY_PLANS = {
    pro_monthly: {
        name: "Monthly Pro",
        amount: 9900,
        duration: 30
    },

    pro_yearly: {
        name: "Yearly Pro",
        amount: 99900,
        duration: 365
    }
};
