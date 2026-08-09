"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, CreditCard, QrCode, Loader2, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { validateUpiId, validateTransactionId } from "@/lib/payment/validation";

interface PaymentProcessorProps {
  amount: number;
  orderId: string;
  type: "booking" | "plan_upgrade_customer" | "plan_upgrade_salon";
  metadata?: Record<string, any>;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: string) => void;
}

const UPI_ID = "7507075722@mbk";
const UPI_NAME = "Mumbai GlamHub";

export default function PaymentProcessor({
  amount,
  orderId,
  type,
  metadata = {},
  onSuccess,
  onError,
}: PaymentProcessorProps) {
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "qr">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [showUpiApps, setShowUpiApps] = useState(false);

  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID copied to clipboard!");
  };

  const openUpiApp = (app: string) => {
    let appUrl = upiUrl;
    
    // App-specific deep links
    switch (app) {
      case "gpay":
        appUrl = `tez://upi/pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;
        break;
      case "phonepe":
        appUrl = `phonepe://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;
        break;
      case "paytm":
        appUrl = `paytmmp://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;
        break;
    }

    window.location.href = appUrl;
    setShowUpiApps(false);
  };

  const verifyPayment = async () => {
    const trimmedTxnId = paymentId.trim();
    
    if (!trimmedTxnId) {
      toast.error("Please enter transaction/UTR number");
      return;
    }

    // Validate transaction ID format
    const txnValidation = validateTransactionId(trimmedTxnId);
    if (!txnValidation.valid) {
      toast.error(txnValidation.error || "Invalid transaction ID");
      return;
    }

    // For UPI, validate the UPI ID if entered
    if (selectedMethod === "upi" && upiIdInput.trim()) {
      const upiValidation = validateUpiId(upiIdInput.trim());
      if (!upiValidation.valid) {
        toast.error(upiValidation.error || "Invalid UPI ID");
        return;
      }
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentId: paymentId.trim(),
          paymentMethod: selectedMethod,
          transactionId: paymentId.trim(),
          utrNumber: paymentId.trim(),
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment verification failed");
      }

      toast.success("Payment verified successfully! 🎉");
      onSuccess?.(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Payment verification failed");
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const initRazorpay = () => {
    setIsProcessing(true);
    
    if (!(window as any).Razorpay) {
      toast.error("Razorpay SDK not loaded. Please refresh the page.");
      setIsProcessing(false);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      amount: amount * 100, // Convert to paise
      currency: "INR",
      name: "Mumbai GlamHub",
      description: type === "booking" ? "Salon Booking" : "Membership Upgrade",
      order_id: orderId,
      handler: async function (response: any) {
        try {
          const res = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              paymentId: response.razorpay_payment_id,
              paymentMethod: "card",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              metadata,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success("Payment successful! 🎉");
          onSuccess?.(data);
        } catch (err: any) {
          toast.error(err.message);
          onError?.(err.message);
        } finally {
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
          toast.error("Payment cancelled");
        },
      },
      theme: {
        color: "#a855f7",
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Select Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedMethod("upi")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              selectedMethod === "upi"
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-purple-500/50"
            )}
          >
            <Smartphone className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-medium text-white">UPI</span>
          </button>
          <button
            onClick={() => setSelectedMethod("qr")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              selectedMethod === "qr"
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-purple-500/50"
            )}
          >
            <QrCode className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-medium text-white">QR Code</span>
          </button>
        </div>
      </div>

      {/* Amount Display */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Amount to Pay</span>
          <span className="text-2xl font-bold text-white">₹{amount}</span>
        </div>
      </div>

      {/* UPI Payment */}
      {selectedMethod === "upi" && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Merchant UPI ID</span>
              <button
                onClick={copyUpiId}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="font-mono text-lg text-white font-semibold">{UPI_ID}</div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => setShowUpiApps(!showUpiApps)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Pay with UPI App
            </Button>

            {showUpiApps && (
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => openUpiApp("gpay")} variant="outline" size="sm">
                  Google Pay
                </Button>
                <Button onClick={() => openUpiApp("phonepe")} variant="outline" size="sm">
                  PhonePe
                </Button>
                <Button onClick={() => openUpiApp("paytm")} variant="outline" size="sm">
                  Paytm
                </Button>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0a0a0f] px-2 text-white/40">OR ENTER MANUALLY AFTER PAYMENT</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Your UPI ID (Optional - for verification)</label>
            <input
              type="text"
              value={upiIdInput}
              onChange={(e) => setUpiIdInput(e.target.value)}
              placeholder="yourname@paytm, 9876543210@ybl"
              className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30"
            />
            <p className="text-xs text-white/40">Format: username@bankcode (e.g., john@paytm, 9876543210@ybl)</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Transaction ID / UTR Number *</label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30"
            />
            <p className="text-xs text-white/40">12-digit number shown in your payment confirmation</p>
          </div>

          <Button
            onClick={verifyPayment}
            disabled={isProcessing || !paymentId.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify Payment
              </>
            )}
          </Button>
        </div>
      )}

      {/* QR Code Payment */}
      {selectedMethod === "qr" && (
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-xl flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`}
                alt="UPI QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-white/60 text-center">
              Scan this QR code with any UPI app to pay
            </p>
            <div className="mt-3 font-mono text-xs text-white/40">{UPI_ID}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">After payment, enter Transaction ID</label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30"
            />
          </div>

          <Button
            onClick={verifyPayment}
            disabled={isProcessing || !paymentId.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify Payment
              </>
            )}
          </Button>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-white/40 text-center">
        <p>💡 Tip: Save the transaction ID for future reference</p>
        <p className="mt-1">For issues, contact support with Order ID: {orderId}</p>
      </div>
    </div>
  );
}
