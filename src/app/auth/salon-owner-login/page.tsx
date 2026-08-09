"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scissors, Eye, EyeOff, Loader2, Mail, Lock,
  AlertCircle, Briefcase, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

function SalonOwnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/salon-owner/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Show errors from OAuth redirects (e.g. ?error=customer_mismatch)
  const urlError = searchParams.get("error");
  const errorMessages: Record<string, string> = {
    google_oauth_failed: "Google sign-in failed. Please try again.",
    auth_callback_failed: "Authentication failed. Please try again.",
    customer_mismatch: "This account is registered as a Customer. Please use the Customer Sign In page instead.",
  };
  const [error, setError] = useState<string | null>(
    urlError ? errorMessages[urlError] ?? "An error occurred. Please try again." : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill all fields"); return; }
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    // Step 1: Authenticate the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setIsLoading(false);
      setError(
        authError.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : authError.message
      );
      return;
    }

    // Step 2: Check role — MUST be salon_owner (or admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", authData.user?.id)
      .single();

    if (!profile || !["salon_owner", "admin"].includes(profile.role)) {
      // Sign them back out — wrong portal
      await supabase.auth.signOut();
      setIsLoading(false);
      setError(
        "This account is registered as a customer. Please use the customer sign-in page instead."
      );
      return;
    }

    setIsLoading(false);
    toast.success(`Welcome back, ${profile.full_name?.split(" ")[0] ?? "Partner"}! 💼`);
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">CuraStyl</span>
          </Link>
          <p className="text-xs text-amber-400/70 mt-2 flex items-center justify-center gap-1">
            <Scissors className="w-3 h-3" />
            Salon Owner Portal
          </p>
        </div>

        <div className="glass-card p-8 border-amber-500/20">
          {/* Portal badge */}
          <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Salon Owner Sign In</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, Partner</h1>
          <p className="text-white/50 text-sm mb-8">
            Sign in to manage your salon, bookings & analytics
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="owner-email" className="block text-xs text-white/50 mb-1.5">
                Business Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="you@yoursalon.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="owner-password" className="text-xs text-white/50">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="owner-password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              id="salon-owner-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Sign In */}
          <a href="/api/auth/google?role=salon_owner"
            className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all w-full">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          {/* Register link */}
          <p className="text-center text-sm text-white/40">
            New to CuraStyl?{" "}
            <Link
              href="/auth/register?role=salon_owner"
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Register your salon →
            </Link>
          </p>

          {/* Customer login link */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/30">
              Are you a customer?{" "}
              <Link
                href="/auth/login"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Customer Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalonOwnerLoginPage() {
  return (
    <Suspense>
      <SalonOwnerLoginForm />
    </Suspense>
  );
}
