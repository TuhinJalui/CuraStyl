// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  currency: "INR",
  companyName: "Mumbai GlamHub",
  companyLogo: "/images/aura-avatar.jpg",
  theme: {
    color: "#8b5cf6", // Purple theme
  },
};

export function validateRazorpayConfig() {
  if (!RAZORPAY_CONFIG.keyId || RAZORPAY_CONFIG.keyId.includes("PASTE")) {
    throw new Error(
      "Razorpay Key ID not configured. Please add NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local"
    );
  }
  if (!RAZORPAY_CONFIG.keySecret || RAZORPAY_CONFIG.keySecret.includes("YOUR_SECRET")) {
    throw new Error(
      "Razorpay Key Secret not configured. Please add RAZORPAY_KEY_SECRET to .env.local"
    );
  }
}

export function getRazorpayKeyId() {
  return RAZORPAY_CONFIG.keyId;
}
