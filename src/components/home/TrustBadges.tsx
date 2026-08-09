import { ShieldCheck, Zap, CreditCard, HeadphonesIcon, BadgeCheck } from "lucide-react";

const badges = [
  { icon: ShieldCheck, title: "100% Verified Salons", desc: "Every salon manually verified" },
  { icon: Zap, title: "Instant Booking", desc: "Confirm in under 60 seconds" },
  { icon: CreditCard, title: "Secure Payments", desc: "256-bit SSL encryption" },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Always here to help" },
  { icon: BadgeCheck, title: "Best Price Guarantee", desc: "Match any lower price" },
];

export default function TrustBadges() {
  return (
    <section className="py-12 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {badges.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">{title}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
