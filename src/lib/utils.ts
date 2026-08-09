import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function generateBookingId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GH-${timestamp}-${random}`;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

export const MUMBAI_AREAS = [
  "Bandra",
  "Andheri",
  "Powai",
  "Juhu",
  "Versova",
  "Malad",
  "Borivali",
  "Dadar",
  "Worli",
  "Lower Parel",
  "Colaba",
  "Fort",
  "Churchgate",
  "Santacruz",
  "Vile Parle",
  "Kurla",
  "Chembur",
  "Ghatkopar",
  "Mulund",
  "Thane",
  "Navi Mumbai",
];

export const SERVICE_CATEGORIES = [
  "Haircut",
  "Hair Color",
  "Hair",
  "Facial",
  "Makeup",
  "Bridal",
  "Spa",
  "Manicure",
  "Pedicure",
  "Waxing",
  "Threading",
  "Massage",
  "Nail",
  "Treatment",
  "HydraFacial",
];

export const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 - ₹1,500", min: 500, max: 1500 },
  { label: "₹1,500 - ₹3,000", min: 1500, max: 3000 },
  { label: "₹3,000 - ₹5,000", min: 3000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: Infinity },
];
