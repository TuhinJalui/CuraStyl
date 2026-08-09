import { Search, CalendarCheck, Sparkles, Star } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Search & Discover",
    desc: "Browse verified salons by service, area, or let our AI suggest the best match for you.",
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
    iconColor: "text-purple-400",
  },
  {
    icon: CalendarCheck,
    step: "02",
    title: "Pick & Book",
    desc: "Choose your preferred stylist, select a time slot, and confirm your booking instantly.",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
    iconColor: "text-pink-400",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Get Glam",
    desc: "Visit your salon, enjoy a premium beauty experience tailored just for you.",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: Star,
    step: "04",
    title: "Review & Repeat",
    desc: "Share your experience, earn loyalty points, and book your next session with ease.",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-14">
          <span className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3 block">Simple Process</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How <span className="gradient-text">CuraStyl</span> Works
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            From discovery to your perfect look — we&apos;ve made beauty booking effortlessly simple.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, step, title, desc, color, iconColor }, idx) => (
            <div key={title} className="relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(100%-4px)] w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
              )}
              <div className={`glass-card p-6 text-center border bg-gradient-to-b ${color} relative z-10 hover:scale-[1.02] transition-all duration-300`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4 relative">
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                  <span className="absolute -top-2 -right-2 text-[11px] font-bold text-white/30 bg-white/5 border border-white/10 rounded-full w-6 h-6 flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
