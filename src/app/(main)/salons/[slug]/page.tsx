import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server-helpers";
import SalonDetailClient from "./SalonDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: salon } = await supabase
    .from("salons")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!salon) return { title: "Salon Not Found" };
  return {
    title: salon.name,
    description: salon.description,
  };
}

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: salon, error } = await supabase
    .from("salons")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !salon) notFound();
  return <SalonDetailClient salon={salon} />;
}
