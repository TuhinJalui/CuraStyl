"use client";

import { useState } from "react";
import { X, CreditCard, Smartphone, Building2, Wallet, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { displayRazorpay, createBookingPayment, createPlanPayment, verifyPayment } from "@/lib/payment/razorpay";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  type: "booking" | "plan_upgrade";
  metadata: {
    userName: string;
    userEmail: string;
    userPhone?: string;
    bookingId?: string;
    salonName?: string;
    salonId?: string;
    planName?: string;
  };
  onSuccess: (paymentId: string) => void;
}

type PaymentMethod = "upi" | "razorpay";

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  type,
  metadata,
  onSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderId, setOrderId] = useState("");

  const merchantUPI = "7507075722@mbk";

  if (!isOpen) return null;

  const handleCreateOrder = async () => {
    try {
      setIsProcessing(true);

      let orderData;
      if (type === "booking") {
        orderData = await createBookingPayment({
          amount,
          userName: metadata.userName,
          userEmail: metadata.userEmail,
          userPhone: metadata.userPhone || "",
          bookingId: metadata.bookingId || "",
          salonName: metadata.salonName || "",
        });
      } else {
        orderData = await createPlanPayment({
          amount,
          planName: metadata.planName || "",
          userName: metadata.userName,
          userEmail: metadata.userEmail,
          salonId: metadata.salonId || "",
        });
      }

      setOrderId(orderData.orderId);
      return orderData;
    } catch (error) {
      console.error("Order creation failed:", error);
      toast.error("Failed to create payment order");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUPIPayment = async () => {
    try {
      if (!transactionId || transactionId.length < 10) {
        toast.error("Please enter a valid transaction ID");
        return;
      }

      setIsProcessing(true);

      // Create order if not already created
      let order = orderId;
      if (!order) {
        const orderData = await handleCreateOrder();
        order = orderData.orderId;
      }

      // Verify payment
      const result = await verifyPayment({
        razorpay_payment_id: transactionId,
        razorpay_order_id: order,
        type,
        metadata: {
          ...metadata,
          orderId: order,
        },
      });

      toast.success("Payment verified successfully!");
      onSuccess(result.paymentId);
      onClose();
    } catch (error) {
      console.error("UPI payment error:", error);
      toast.error("Payment verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    try {
      setIsProcessing(true);

      const orderData = await handleCreateOrder();

      const options = {
        key: orderData.key,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        name: "Mumbai GlamHub",
        description: type === "booking" ? `Booking at ${metadata.salonName}` : `${metadata.planName} Plan Upgrade`,
        order_id: orderData.orderId,
        prefill: {
          name: metadata.userName,
          email: metadata.userEmail,
          contact: metadata.userPhone || "",
        },
        theme: {
          color: "#8b5cf6",
        },
        handler: async (response: any) => {
          try {
            const result = await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              type,
              metadata: {
                ...metadata,
                orderId: orderData.orderId,
              },
            });

            toast.success("Payment successful!");
            onSuccess(result.paymentId);
            onClose();
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      await displayRazorpay(options);
    } catch (error) {
      console.error("Razorpay payment error:", error);
      toast.error("Payment initiation failed");
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateUPILink = () => {
    const upiLink = `upi://pay?pa=${merchantUPI}&pn=Mumbai GlamHub&am=${amount}&cu=INR&tn=${type === "booking" ? "Booking Payment" : "Plan Upgrade"}`;
    window.location.href = upiLink;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md glass-card p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-xl">Complete Payment</h3>
            <p className="text-white/50 text-sm mt-1">Amount: ₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedMethod("upi")}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              selectedMethod === "upi"
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 hover:border-white/20"
            )}
            disabled={isProcessing}
          >
            <Smartphone className="w-5 h-5 text-purple-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">UPI Payment</p>
              <p className="text-xs text-white/50">Pay via Google Pay, PhonePe, Paytm</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod("razorpay")}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              selectedMethod === "razorpay"
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 hover:border-white/20"
            )}
            disabled={isProcessing}
          >
            <CreditCard className="w-5 h-5 text-blue-400" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">Card / Wallet / UPI</p>
              <p className="text-xs text-white/50">All payment methods via Razorpay</p>
            </div>
          </button>
        </div>

        {/* UPI Payment Section */}
        {selectedMethod === "upi" && (
          <div className="space-y-4">
            <div className="glass-card p-4 border border-purple-500/30">
              <p className="text-sm text-white/70 mb-3">Pay to our UPI ID:</p>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm">
                  {merchantUPI}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(merchantUPI)}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={generateUPILink}
                className="w-full gap-2"
                variant="outline"
                disabled={isProcessing}
              >
                <QrCode className="w-4 h-4" />
                Open UPI App
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/70 mb-2 block">
                  Transaction ID / UTR Number
                </label>
                <Input
                  placeholder="Enter 12-digit transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <Button
                onClick={handleUPIPayment}
                className="w-full gap-2"
                disabled={isProcessing || !transactionId}
              >
                {isProcessing ? "Verifying..." : "Verify Payment"}
              </Button>
            </div>

            <p className="text-xs text-white/40 text-center">
              After making payment, enter the transaction ID above
            </p>
          </div>
        )}

        {/* Razorpay Payment Section */}
        {selectedMethod === "razorpay" && (
          <div className="space-y-4">
            <div className="glass-card p-4 border border-blue-500/30">
              <p className="text-sm text-white/70 mb-2">Secure payment powered by Razorpay</p>
              <ul className="text-xs text-white/50 space-y-1 ml-4 list-disc">
                <li>Credit/Debit Cards</li>
                <li>Net Banking</li>
                <li>UPI (Google Pay, PhonePe, etc.)</li>
                <li>Wallets (Paytm, PhonePe, Amazon Pay)</li>
              </ul>
            </div>

            <Button
              onClick={handleRazorpayPayment}
              className="w-full gap-2"
              disabled={isProcessing}
            >
              <CreditCard className="w-4 h-4" />
              {isProcessing ? "Processing..." : "Pay ₹" + amount.toLocaleString("en-IN")}
            </Button>

            <p className="text-xs text-white/40 text-center">
              You'll be redirected to secure payment gateway
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
