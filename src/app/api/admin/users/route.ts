import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/route-guards";

// GET /api/admin/users
export const GET = withAdmin(async (req, { supabase }) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data ?? [];
  const stats = {
    total: users.length,
    customers: users.filter((u: { role: string }) => u.role === "customer").length,
    salonOwners: users.filter((u: { role: string }) => u.role === "salon_owner").length,
    admins: users.filter((u: { role: string }) => u.role === "admin").length,
  };

  return NextResponse.json({ users, stats });
});

// PATCH /api/admin/users — update role
export const PATCH = withAdmin(async (req, { supabase }) => {
  const { userId, role } = await req.json();

  if (!userId || !role || !["customer", "salon_owner", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "userId and valid role required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id, full_name, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
});
