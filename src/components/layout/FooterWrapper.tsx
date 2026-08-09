"use client";

import Footer from "@/components/layout/Footer";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function FooterWrapper() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid rendering dynamic route-based UI on the server to prevent hydration
  // mismatches. Defer to client after mount.
  if (!mounted) return null;

  // Show footer only on the landing page (and root path)
  if (pathname === "/" || pathname.startsWith("/landing")) {
    return <Footer />;
  }

  return null;
}
