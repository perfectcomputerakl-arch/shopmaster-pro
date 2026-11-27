// ShopMaster Pro - Razorpay Configuration

// Razorpay Public Key ID (Test Mode)
export const RAZORPAY_KEY_ID = "rzp_test_U52W32sGZQIjSq";

// Payment Configuration
export const RAZORPAY_CONFIG = {
  name: "ShopMaster Pro",
  description: "ShopMaster Pro Subscription",
  currency: "INR",
  theme: {
    color: "#1d5cff"
  }
};

// Subscription Plans
export const RAZORPAY_PLANS = {
  pro_monthly: {
    name: "Monthly Pro",
    amount: 9900, // ₹99
    duration: 30
  },

  pro_yearly: {
    name: "Yearly Pro",
    amount: 99900, // ₹999
    duration: 365
  }
};
