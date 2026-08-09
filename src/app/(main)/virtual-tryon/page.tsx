import { Metadata } from "next";
import RouteGuard from "@/components/auth/RouteGuard";
import VirtualTryOnClient from "./VirtualTryOnClient";

export const metadata: Metadata = {
  title: "Virtual Try-On | CuraStyl",
  description: "Try hairstyles, facial treatments, and makeup virtually with AI-powered AR technology",
};

export default function VirtualTryOnPage() {
  return (
    <RouteGuard requireAuth>
      <VirtualTryOnClient />
    </RouteGuard>
  );
}
