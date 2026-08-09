import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh5.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "salons.bblunt.com",
      },
      {
        protocol: "https",
        hostname: "**.bblunt.com",
      },
      {
        protocol: "https",
        hostname: "kromakay.com",
      },
      {
        protocol: "https",
        hostname: "**.kromakay.com",
      },
      {
        protocol: "https",
        hostname: "tse3.mm.bing.net",
      },
      {
        protocol: "https",
        hostname: "**.bing.net",
      },
      {
        protocol: "https",
        hostname: "images.jdmagicbox.com",
      },
      {
        protocol: "https",
        hostname: "**.jdmagicbox.com",
      },
    ],
  },
  // Dashboard and placeholder redirects to prevent 404s
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
      {
        source: '/dashboard/favorites',
        destination: '/#favorites',
        permanent: true,
      },
      {
        source: '/pricing',
        destination: '/',
        permanent: true,
      },
      {
        source: '/partners',
        destination: '/',
        permanent: true,
      },
      {
        source: '/marketing',
        destination: '/',
        permanent: true,
      },
      {
        source: '/api-docs',
        destination: '/',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/',
        permanent: true,
      },
      {
        source: '/terms-of-service',
        destination: '/',
        permanent: true,
      },
      {
        source: '/refund-policy',
        destination: '/',
        permanent: true,
      },
      {
        source: '/sitemap',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Allow OpenStreetMap iframe embeds on salon detail pages and Virtual Try-On external apps
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://www.openstreetmap.org https://openstreetmap.org https://model-men.vercel.app https://model-two-henna.vercel.app",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Suppress known hydration issues with browser extensions
  reactStrictMode: true,
};

export default nextConfig;
