import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import MiniChatWidget from "@/components/shared/MiniChatWidget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "CuraStyl – Book Beauty Salons in Mumbai",
    template: "%s | CuraStyl",
  },
  description:
    "Discover and book the best beauty salons in Mumbai. AI-powered recommendations for haircuts, facials, spa, makeup, and more across Bandra, Andheri, Juhu & beyond.",
  keywords: [
    "beauty salon Mumbai",
    "book salon",
    "haircut Mumbai",
    "spa Mumbai",
    "makeup artist Mumbai",
    "bridal makeup Mumbai",
  ],
  authors: [{ name: "CuraStyl" }],
  creator: "CuraStyl",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://CuraStyl.vercel.app",
    title: "CuraStyl – AI-Powered Beauty Salon Marketplace",
    description: "Find, compare & book top beauty salons across Mumbai",
    siteName: "CuraStyl",
  },
  twitter: {
    card: "summary_large_image",
    title: "CuraStyl",
    description: "Find, compare & book top beauty salons across Mumbai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0f] text-[#f5f0ff] antialiased">
        <Navbar />
        {children}
        <MiniChatWidget />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(26, 10, 46, 0.95)",
              backdropFilter: "blur(12px)",
              color: "#f5f0ff",
              border: "1px solid rgba(192, 132, 252, 0.3)",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            },
            success: {
              iconTheme: {
                primary: "#c084fc",
                secondary: "#0a0a0f",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#0a0a0f",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
