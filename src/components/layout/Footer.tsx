import Link from "next/link";
import { Scissors, Mail, Phone, MapPin } from "lucide-react";

// Social icons as inline SVGs (not in this lucide version)
const SocialIcon = ({ children }: { children: React.ReactNode }) => (
  <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-200">
    <span className="text-white/60 text-sm">{children}</span>
  </a>
);

export default function Footer() {
  return (
    <footer className="border-t border-purple-500/15 bg-[#080810]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg gradient-text leading-none">CuraStyl</div>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Mumbai&apos;s premier AI-powered beauty salon marketplace. Discover, compare, and book the best salons across the city.
            </p>
            <div className="flex items-center gap-3">
              <SocialIcon>📸</SocialIcon>
              <SocialIcon>🐦</SocialIcon>
              <SocialIcon>📘</SocialIcon>
              <SocialIcon>▶️</SocialIcon>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Explore</h4>
            <ul className="space-y-3">
              {[
                { label: "Browse Salons", href: "/salons" },
                { label: "Top Rated", href: "/salons?sort=rating" },
                { label: "Special Offers", href: "/offers" },
                { label: "AI Beauty Assistant", href: "/ai-assistant" },
                { label: "Bridal Packages", href: "/salons?service=Bridal+Package" },
                { label: "Spa & Wellness", href: "/salons?service=Spa" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 hover:text-purple-300 text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h4 className="font-semibold text-white mb-4">For Business</h4>
            <ul className="space-y-3">
              {[
                { label: "List Your Salon", href: "/auth/register?role=salon_owner" },
                { label: "Owner Dashboard", href: "/salon-owner/dashboard" },
                { label: "Pricing Plans", href: "/" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 hover:text-purple-300 text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/50">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                Fr. Agnel Ashram, Bandstand, Bandra (W). Mumbai 400 050. MH. IN
              </li>
              <li className="flex items-center gap-2 text-sm text-white/50">
                <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                shreyasmahajan0306@gmail.com
              </li>
              <li className="flex items-center gap-2 text-sm text-white/50">
                <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                +91 75070 77522
              </li>
            </ul>
            <div className="mt-6">
              <h4 className="font-semibold text-white mb-3 text-sm">Download App</h4>
              <div className="flex flex-col gap-2">
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 cursor-pointer transition-all">
                  📱 App Store – Coming Soon
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 cursor-pointer transition-all">
                  🤖 Google Play – Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © 2026 CuraStyl. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy Policy", "Terms of Service", "Refund Policy", "Sitemap"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
