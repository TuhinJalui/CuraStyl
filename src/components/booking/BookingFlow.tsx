"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, CreditCard, CheckCircle2, X, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout";
import type { RazorpaySuccessResponse } from "@/lib/razorpay/checkout";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingFlowProps {
  salonId: string;
  salonName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingFlow({
  salonId,
  salonName,
  onClose,
  onSuccess,
}: BookingFlowProps) {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash_in_hand">("card");

  // Fetch services
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("salon_id", salonId)
        .order("price", { ascending: true });
      
      if (data) {
        setServices(data);
      }
    }
    fetchServices();
  }, [salonId, supabase]);

  // Generate time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDate]);

  function generateTimeSlots() {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let min of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        slots.push({ time, available: true });
      }
    }
    setTimeSlots(slots);
  }

  function getNextSevenDays() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      });
    }
    return dates;
  }

  async function handleConfirmBooking() {
    if (!selectedService || !profile) return;
    if (paymentMethod === "cash_in_hand") {
      await handleCashBooking();
    } else {
      await handlePayment();
    }
  }

  async function handleCashBooking() {
    if (!selectedService || !profile) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          serviceId: selectedService.id,
          staffId: null,
          date: selectedDate,
          timeSlot: selectedTime,
          paymentMethod: "cash_in_hand",
          paymentStatus: "pending",
          paymentId: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");

      setBookingId(data.booking.id);
      setStep(4);
      setLoading(false);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      alert(error.message || "Failed to confirm booking");
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!selectedService || !profile) return;

    setLoading(true);
    try {
      // Create Razorpay order
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedService.price,
          notes: {
            salon_id: salonId,
            service_id: selectedService.id,
            booking_date: selectedDate,
            booking_time: selectedTime,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // Open Razorpay checkout
      openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        name: salonName,
        description: selectedService.name,
        prefill: {
          name: profile.full_name || "",
          email: profile.email || "",
          contact: profile.phone || "",
        },
        notes: {
          salon_id: salonId,
          service_id: selectedService.id,
        },
        onSuccess: async (response: RazorpaySuccessResponse) => {
          await handlePaymentSuccess(response);
        },
        onFailure: (error: any) => {
          console.error("Payment failed:", error);
          alert("Payment failed. Please try again.");
          setLoading(false);
        },
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(error.message || "Failed to initiate payment");
      setLoading(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    try {
      // Verify payment
      const verifyRes = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.verified) {
        throw new Error("Payment verification failed");
      }

      // Create booking via API
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          serviceId: selectedService!.id,
          staffId: null,
          date: selectedDate,
          timeSlot: selectedTime,
          paymentMethod: "card",
          paymentStatus: "paid",
          paymentId: response.razorpay_payment_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");

      setBookingId(data.booking.id);
      setStep(4); // Success step
      setLoading(false);
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      console.error("Booking creation error:", error);
      alert(error.message || "Failed to create booking");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass rounded-3xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div>
            <h3 className="text-xl font-semibold text-white">Book Appointment</h3>
            <p className="text-sm text-white/50">{salonName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl glass hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {["Service", "Date & Time", "Payment", "Done"].map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step > i + 1
                      ? "bg-emerald-500 text-white"
                      : step === i + 1
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className="ml-2 text-xs text-white/60">{label}</span>
                {i < 3 && (
                  <div className="flex-1 h-0.5 bg-white/10 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70 mb-3">Select a service:</h4>
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    selectedService?.id === service.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/10 glass hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{service.name}</p>
                      <p className="text-sm text-white/50">{service.duration} min</p>
                    </div>
                    <p className="text-lg font-semibold text-white">₹{service.price}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Date */}
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Select Date:
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {getNextSevenDays().map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setSelectedDate(date.value)}
                      className={cn(
                        "p-3 rounded-xl border text-sm transition-all",
                        selectedDate === date.value
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-white/10 glass hover:border-white/20 text-white/70"
                      )}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              {selectedDate && (
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Select Time:
                  </h4>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          "p-2 rounded-lg border text-sm transition-all",
                          selectedTime === slot.time
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : slot.available
                            ? "border-white/10 glass hover:border-white/20 text-white/70"
                            : "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && selectedService && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 border border-white/10">
                <h4 className="text-sm font-medium text-white/70 mb-4">Booking Summary</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Service</span>
                    <span className="text-white font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Date</span>
                    <span className="text-white font-medium">
                      {new Date(selectedDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Time</span>
                    <span className="text-white font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-white/10">
                    <span className="text-white font-medium">Total Amount</span>
                    <span className="text-xl text-white font-bold">₹{selectedService.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/70">Select Payment Method:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "p-4 rounded-xl border text-left flex flex-col gap-2 transition-all",
                      paymentMethod === "card"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 glass hover:border-white/20"
                    )}
                  >
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="font-semibold text-white text-sm">Online Payment</p>
                      <p className="text-xs text-white/40">Pay securely via Razorpay</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("cash_in_hand")}
                    className={cn(
                      "p-4 rounded-xl border text-left flex flex-col gap-2 transition-all",
                      paymentMethod === "cash_in_hand"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 glass hover:border-white/20"
                    )}
                  >
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white text-sm">Cash in Hand</p>
                      <p className="text-xs text-white/40">Pay directly at the salon</p>
                    </div>
                  </button>
                </div>
              </div>

              {paymentMethod === "cash_in_hand" ? (
                <div className="glass rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-sm text-emerald-300">
                    💵 No online payment needed now. Pay directly to the salon owner during verification.
                  </p>
                </div>
              ) : (
                <div className="glass rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-sm text-emerald-400">
                    🎉 You'll earn {Math.floor(selectedService.price / 100) * 10} GlamPoints with this booking!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h3>
              <p className="text-white/60 mb-6">
                Your appointment has been successfully booked.
                <br />
                Check your notifications for details.
              </p>
              <Button onClick={onClose} className="px-8">
                Done
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        {step < 4 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              disabled={loading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={() => {
                if (step === 1 && selectedService) setStep(2);
                else if (step === 2 && selectedDate && selectedTime) setStep(3);
                else if (step === 3) handleConfirmBooking();
              }}
              disabled={
                loading ||
                (step === 1 && !selectedService) ||
                (step === 2 && (!selectedDate || !selectedTime))
              }
              className="min-w-32"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : step === 3 ? (
                paymentMethod === "cash_in_hand" ? (
                  <span className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Confirm Booking
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Pay ₹{selectedService?.price}
                  </span>
                )
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
