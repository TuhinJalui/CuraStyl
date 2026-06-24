"use client";

import { useState, useEffect } from "react";
import {
  X, Copy, CheckCircle2, Loader2, Clock, ArrowLeft, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const UPI_ID = "7507075722@mbk";
const MERCHANT_NAME = "CuraStyl";

const UPI_APPS = [
  {
    name: "GPay",
    color: "from-blue-500 to-blue-600",
    emoji: "G",
    scheme: "gpay://upi/pay",
  },
  {
    name: "PhonePe",
    color: "from-purple-600 to-violet-700",
    emoji: "P",
    scheme: "phonepe://pay",
  },
  {
    name: "Paytm",
    color: "from-sky-500 to-cyan-600",
    emoji: "₹",
    scheme: "paytmmp://pay",
  },
  {
    name: "BHIM",
    color: "from-orange-500 to-red-600",
    emoji: "B",
    scheme: "upi://pay",
  },
];

interface UpiPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number; // in rupees
  orderId: string;
  description: string;
  onSuccess: (utrNumber: string) => void;
  isVerifying?: boolean;
}

export default function UpiPaymentModal({
  open,
  onClose,
  amount,
  orderId,
  description,
  onSuccess,
  isVerifying = false,
}: UpiPaymentModalProps) {
  const [utrNumber, setUtrNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"qr" | "confirm">("qr");
  const [timer, setTimer] = useState(600); // 10 minutes

  const upiParams = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `${description} | ${orderId.slice(-8)}`,
  });
  const upiDeepLink = `upi://pay?${upiParams.toString()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}&ecc=M&format=png&color=7c3aed&bgcolor=ffffff&margin=10`;

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep("qr");
    setUtrNumber("");
    setTimer(600);
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md glass-card overflow-hidden shadow-2xl shadow-purple-900/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">UPI Payment</p>
              <p className="text-white/40 text-[10px]">Secured · 256-bit SSL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {step === "qr" ? (
            <>
              {/* Amount */}
              <div className="text-center">
                <p className="text-white/40 text-xs mb-1">Pay Exactly</p>
                <p className="text-4xl font-black gradient-text">
                  ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-white/25 text-[10px] mt-1 font-mono">
                  Ref: {orderId.slice(-12).toUpperCase()}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-white rounded-2xl shadow-xl shadow-purple-500/20 border-4 border-purple-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="UPI Payment QR Code"
                    width={190}
                    height={190}
                    className="rounded-xl block"
                  />
                </div>
                <p className="text-white/30 text-xs">
                  Scan with any UPI app to pay
                </p>
              </div>

              {/* UPI ID Copy */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 mb-0.5">UPI ID</p>
                  <p className="font-mono font-bold text-white text-sm tracking-wide">
                    {UPI_ID}
                  </p>
                </div>
                <button
                  onClick={copyUpiId}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  title="Copy UPI ID"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/40" />
                  )}
                </button>
              </div>

              {/* UPI App Quick Launch */}
              <div>
                <p className="text-xs text-white/40 mb-2 text-center">
                  Open directly in your UPI app
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {UPI_APPS.map((app) => {
                    const appParams = new URLSearchParams({
                      pa: UPI_ID,
                      pn: MERCHANT_NAME,
                      am: amount.toFixed(2),
                      cu: "INR",
                      tn: `${description} | ${orderId.slice(-8)}`,
                    });
                    const link = `${app.scheme}?${appParams.toString()}`;
                    return (
                      <a
                        key={app.name}
                        href={link}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-white/10 transition-all group"
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br shrink-0 group-hover:scale-110 transition-transform",
                            app.color
                          )}
                        >
                          {app.emoji}
                        </div>
                        <span className="text-[10px] text-white/40 group-hover:text-white/60">
                          {app.name}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 py-1">
                <Clock
                  className={cn(
                    "w-3.5 h-3.5",
                    timer < 60 ? "text-red-400" : "text-amber-400"
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    timer < 60 ? "text-red-400" : "text-amber-400"
                  )}
                >
                  {formatTime(timer)}
                </span>
                <span className="text-white/30 text-xs">remaining</span>
              </div>

              {timer === 0 ? (
                <div className="text-center">
                  <p className="text-red-400 text-sm mb-3">
                    Session expired. Please close and try again.
                  </p>
                  <Button variant="glass" onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setStep("confirm")}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 h-11"
                >
                  ✅ I&apos;ve Paid — Enter Transaction ID
                </Button>
              )}
            </>
          ) : (
            /* Confirm Step */
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="font-bold text-white text-lg">
                  Confirm Payment
                </h4>
                <p className="text-white/40 text-sm mt-1">
                  Enter your UTR / Transaction ID from the UPI app
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    UTR / Transaction ID *
                  </label>
                  <Input
                    value={utrNumber}
                    onChange={(e) =>
                      setUtrNumber(e.target.value.toUpperCase().trim())
                    }
                    placeholder="e.g. 123456789012"
                    className="font-mono uppercase tracking-wider"
                    autoFocus
                  />
                  <p className="text-xs text-white/25 mt-1">
                    Minimum 6 characters required
                  </p>
                </div>

                {/* How to find UTR */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-1.5 text-xs text-white/50">
                  <p className="text-white/60 font-medium mb-1">
                    📌 Where to find your UTR?
                  </p>
                  <p>
                    <span className="text-blue-400">GPay:</span> Tap payment →
                    3 dots → Details → UPI Ref ID
                  </p>
                  <p>
                    <span className="text-purple-400">PhonePe:</span> History →
                    tap payment → UPI Ref No.
                  </p>
                  <p>
                    <span className="text-cyan-400">Paytm:</span> Passbook →
                    tap payment → Transaction ID
                  </p>
                  <p>
                    <span className="text-orange-400">BHIM:</span> History →
                    tap payment → UPI Txn ID
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="glass"
                  onClick={() => setStep("qr")}
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={() =>
                    utrNumber.trim().length >= 6 && onSuccess(utrNumber.trim())
                  }
                  disabled={utrNumber.trim().length < 6 || isVerifying}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Confirm Payment ✓"
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-white/25">
                🔒 Your payment details are encrypted and secure
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
