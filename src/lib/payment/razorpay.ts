/**
 * Razorpay Payment Integration
 * Handles payment processing for bookings and plan upgrades
 */

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (₹1 = 100 paise)
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Load Razorpay script dynamically
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Display Razorpay payment modal
 */
export async function displayRazorpay(options: RazorpayOptions): Promise<boolean> {
  const loaded = await loadRazorpayScript();
  
  if (!loaded) {
    console.error("Razorpay SDK failed to load");
    return false;
  }

  const paymentObject = new window.Razorpay(options);
  paymentObject.open();
  
  return true;
}

/**
 * Create payment intent for booking
 */
export async function createBookingPayment(bookingData: {
  amount: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  bookingId: string;
  salonName: string;
}) {
  const response = await fetch("/api/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: bookingData.amount,
      type: "booking",
      metadata: {
        bookingId: bookingData.bookingId,
        salonName: bookingData.salonName,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment order");
  }

  return response.json();
}

/**
 * Create payment intent for plan upgrade
 */
export async function createPlanPayment(planData: {
  amount: number;
  planName: string;
  userName: string;
  userEmail: string;
  salonId: string;
}) {
  const response = await fetch("/api/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: planData.amount,
      type: "plan_upgrade",
      metadata: {
        salonId: planData.salonId,
        planName: planData.planName,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment order");
  }

  return response.json();
}

/**
 * Verify payment after completion
 */
export async function verifyPayment(data: {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  type: "booking" | "plan_upgrade";
  metadata?: Record<string, any>;
}) {
  const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Payment verification failed");
  }

  return response.json();
}
