import { Metadata } from "next";
import RouteGuard from "@/components/auth/RouteGuard";
import AIAssistantClient from "./AIAssistantClient";

export const metadata: Metadata = {
  title: "AI Beauty Assistant",
  description: "Ask our AI for personalized salon and beauty recommendations in Mumbai.",
};

export default function AIAssistantPage() {
  return (
    <RouteGuard requireAuth>
      <AIAssistantClient />
    </RouteGuard>
  );
}
