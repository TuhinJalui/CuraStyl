import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const role = searchParams.get("role") ?? "customer";

  // Dynamically determine the site URL using forwarded headers for accurate protocol & host on Vercel
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const siteUrl = !origin.includes("localhost") 
    ? origin 
    : (process.env.NEXT_PUBLIC_SITE_URL || origin);

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if profile already exists to preserve role and check for role mismatch
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      // Use existing role if profile exists, otherwise use the role from URL parameter
      const finalRole = existingProfile?.role ?? role;

      // Check for role mismatch
      if (existingProfile) {
        if (existingProfile.role === "customer" && role === "salon_owner") {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${siteUrl}/auth/salon-owner-login?error=customer_mismatch`);
        }
        if (["salon_owner", "admin"].includes(existingProfile.role) && role === "customer") {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${siteUrl}/auth/login?error=salon_owner_mismatch`);
        }
      }

      // Auto-save profile details from Google OAuth
      const meta = data.user.user_metadata ?? {};
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? "",
          full_name: meta.full_name ?? meta.name ?? data.user.email?.split("@")[0] ?? "",
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          phone: meta.phone ?? null,
          role: finalRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("❌ Failed to create/update profile:", profileError);
      } else {
        console.log("✅ Profile created/updated successfully");
      }

      // Determine redirect based on final role
      // If salon owner and has existing salon, go to dashboard; otherwise go to register
      let redirectPath;
      if (finalRole === "salon_owner") {
        if (existingProfile) {
          // Existing salon owner - check if they have a salon
          const { data: salon } = await supabase
            .from("salons")
            .select("id")
            .eq("owner_id", data.user.id)
            .maybeSingle();
          redirectPath = salon ? "/salon-owner/dashboard" : "/salon-owner/register";
        } else {
          // New salon owner - go to register their salon
          redirectPath = "/salon-owner/register";
        }
      } else {
        redirectPath = next;
      }
      return NextResponse.redirect(`${siteUrl}${redirectPath}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(
    `${siteUrl}/auth/login?error=auth_callback_failed`
  );
}
