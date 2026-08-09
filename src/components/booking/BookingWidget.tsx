"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Scissors, User, CalendarDays, Clock, CheckCircle2, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, generateBookingId } from "@/lib/utils";
import type { Salon, Service, Staff } from "@/types";
import Image from "next/image";
import { useAuth } from "@/lib/auth/useAuth";

interface Props {
  salon: Salon;
  services: Service[];
  staff: Staff[];
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Service", "Stylist", "Date", "Time", "Confirm"];

const TIME_SLOTS = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
];

// Fake unavailable slots
const UNAVAILABLE = new Set(["11:00 AM", "12:00 PM", "01:30 PM", "03:00 PM", "05:30 PM"]);

export default function BookingWidget({ salon, services, staff }: Props) {
  const { isSalonOwner } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  if (isSalonOwner) {
    return (
      <div className="glass-dark rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl shadow-black/40 p-6 text-center">
        <div className="bg-purple-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
          <User className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Salon Owner Account</h3>
        <p className="text-white/60 text-xs leading-relaxed mb-4">
          You are currently signed in as a Salon Owner. Booking appointments is only available for Customer accounts.
        </p>
        <Button
          onClick={() => router.push("/salon-owner/dashboard")}
          className="w-full text-xs"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return true; // staff optional
    if (step === 3) return selectedDate !== "";
    if (step === 4) return selectedTime !== "";
    return true;
  };

  const handleConfirm = () => {
    const bookingId = generateBookingId();
    const params = new URLSearchParams({
      bookingId,
      salonId: salon.id,
      salonName: salon.name,
      serviceId: selectedService!.id,
      serviceName: selectedService!.name,
      price: String(selectedService!.price),
      date: selectedDate,
      time: selectedTime,
      staffName: selectedStaff?.name ?? "Any available",
    });
    if (selectedStaff) {
      params.append("staffId", selectedStaff.id);
    }
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="glass-dark rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-5 py-4 border-b border-white/10">
        <p className="text-white font-semibold text-base">Book Appointment</p>
        <p className="text-white/50 text-xs mt-0.5">Instant confirmation guaranteed</p>
      </div>

      {/* Step Indicator */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-1">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as Step;
            const isDone = n < step;
            const isActive = n === step;
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isDone ? "bg-emerald-500 text-white scale-95" :
                    isActive ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110 shadow-lg shadow-purple-500/40" :
                      "bg-white/10 text-white/30"
                )}>
                  {isDone ? "✓" : n}
                </div>
                <span className={cn("text-[10px] hidden sm:block text-center leading-tight", isActive ? "text-purple-300" : isDone ? "text-emerald-400" : "text-white/30")}>
                  {label}
                </span>
                {/* Connector */}
                {i < STEP_LABELS.length - 1 && (
                  <div className="absolute" style={{ display: "none" }} />
                )}
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="px-5 py-4 min-h-[260px]">

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Choose Service</h3>
            </div>
            {services.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">No services available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedService(svc)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl border transition-all duration-200",
                      selectedService?.id === svc.id
                        ? "border-purple-400 bg-purple-500/15 shadow-sm shadow-purple-500/20"
                        : "border-white/10 bg-white/3 hover:border-purple-500/30 hover:bg-white/6"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-white text-sm truncate">{svc.name}</p>
                        <p className="text-xs text-white/40">{svc.duration} min • {svc.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-purple-300 text-sm">{formatPrice(svc.price)}</span>
                        {selectedService?.id === svc.id && (
                          <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Staff */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Choose Stylist</h3>
              <Badge variant="secondary" className="text-[10px]">Optional</Badge>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border transition-all duration-200",
                  selectedStaff === null
                    ? "border-purple-400 bg-purple-500/15"
                    : "border-white/10 bg-white/3 hover:border-purple-500/30"
                )}
              >
                <p className="font-medium text-white text-sm">Any Available Stylist</p>
                <p className="text-xs text-white/40">We&apos;ll assign the best available</p>
              </button>
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3",
                    selectedStaff?.id === member.id
                      ? "border-purple-400 bg-purple-500/15"
                      : "border-white/10 bg-white/3 hover:border-purple-500/30"
                  )}
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-300">
                        {member.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{member.name}</p>
                    <p className="text-xs text-white/40">{member.role} • ⭐ {member.rating}</p>
                  </div>
                  {selectedStaff?.id === member.id && (
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Choose Date */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Choose Date</h3>
            </div>
            {/* Quick date options */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const val = d.toISOString().split("T")[0];
                const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
                return (
                  <button
                    key={val}
                    onClick={() => setSelectedDate(val)}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200",
                      selectedDate === val
                        ? "border-purple-400 bg-purple-500/20 text-purple-300"
                        : "border-white/10 text-white/50 hover:border-purple-500/30 hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50 [color-scheme:dark]"
              aria-label="Select date"
            />
          </div>
        )}


        {/* Step 4: Choose Time */}
        {step === 4 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Choose Time Slot</h3>
            </div>
            <div className="flex items-center gap-4 text-xs mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-purple-400/60 bg-purple-500/15" />
                <span className="text-white/50">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-purple-500/80" />
                <span className="text-white/50">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/5" />
                <span className="text-white/30">Booked</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {TIME_SLOTS.map((time) => {
                const unavail = UNAVAILABLE.has(time);
                const selected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => !unavail && setSelectedTime(time)}
                    disabled={unavail}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium transition-all duration-200 border",
                      unavail
                        ? "time-slot-unavailable"
                        : selected
                          ? "time-slot-selected"
                          : "time-slot-available"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && selectedService && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Booking Summary</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Salon", value: salon.name },
                { label: "Service", value: selectedService.name },
                { label: "Stylist", value: selectedStaff?.name ?? "Any Available" },
                { label: "Date", value: new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) },
                { label: "Time", value: selectedTime },
                { label: "Duration", value: `${selectedService.duration} min` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start text-sm">
                  <span className="text-white/40">{label}</span>
                  <span className="text-white font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2.5 flex justify-between items-center">
                <span className="text-white/60 font-medium">Total</span>
                <span className="text-xl font-bold gradient-text">{formatPrice(selectedService.price)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-5 pb-5 flex items-center gap-3">
        {step > 1 && (
          <Button
            variant="glass"
            onClick={() => setStep((prev) => (prev - 1) as Step)}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        {step < 5 ? (
          <Button
            onClick={() => setStep((prev) => (prev + 1) as Step)}
            disabled={!canProceed()}
            className="flex-1 gap-1.5"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleConfirm}
            className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Booking
          </Button>
        )}
      </div>

      {/* Trust line */}
      <div className="px-5 pb-4 text-center text-xs text-white/25">
        🔒 Instant confirmation • Free cancellation up to 24h before
      </div>
    </div>
  );
}
