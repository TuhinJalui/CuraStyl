// Razorpay Checkout Integration (Client-side)
import { RAZORPAY_CONFIG } from "./config";

interface RazorpayOptions {
  orderId: string;
  amount: number;
  currency?: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (error: any) => void;
}

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: RazorpayOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Failed to load Razorpay SDK");
  }

  const rzpOptions = {
    key: RAZORPAY_CONFIG.keyId,
    order_id: options.orderId,
    amount: options.amount,
    currency: options.currency || RAZORPAY_CONFIG.currency,
    name: RAZORPAY_CONFIG.companyName,
    description: options.description,
    image: RAZORPAY_CONFIG.companyLogo,
    prefill: options.prefill,
    notes: options.notes,
    theme: RAZORPAY_CONFIG.theme,
    handler: (response: RazorpaySuccessResponse) => {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        options.onFailure({ error: "Payment cancelled by user" });
      },
    },
  };

  const rzp = new window.Razorpay(rzpOptions);
  
  rzp.on("payment.failed", (response: any) => {
    options.onFailure(response.error);
  });

  rzp.open();
}
