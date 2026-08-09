"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Scissors, Eye, EyeOff, Loader2, Mail, Lock, User, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Briefcase } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "salon_owner" ? "salon_owner" : "customer";
  const [role, setRole] = useState<"customer" | "salon_owner">(initialRole);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Please accept the Terms of Service"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    // Look up what role this email has before signing up
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", form.email)
      .maybeSingle();

    if (existingProfile) {
      setIsLoading(false);
      if (existingProfile.role === "salon_owner" && role === "customer") {
        setError(
          "This email is already registered as a Salon Owner. Please use the Salon Owner Sign In page."
        );
      } else if (existingProfile.role === "customer" && role === "salon_owner") {
        setError(
          "This email is already registered as a Customer. Please use the Customer Sign In page."
        );
      } else {
        setError("An account with this email already exists. Please sign in instead.");
      }
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, phone: form.phone || "", role },
        emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    });

    if (authError) {
      // Check for role mismatch: user already exists with a different role
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("user already exists")
      ) {
        // Look up what role this email has
        const supabase2 = createClient();
        const { data: existingProfile } = await supabase2
          .from("profiles")
          .select("role")
          .eq("email", form.email)
          .maybeSingle();

        if (existingProfile) {
          const existingRole = existingProfile.role;
          if (existingRole === "salon_owner" && role === "customer") {
            setError(
              "This email is already registered as a Salon Owner. Please use the Salon Owner Sign In page."
            );
          } else if (existingRole === "customer" && role === "salon_owner") {
            setError(
              "This email is already registered as a Customer. Please use the Customer Sign In page."
            );
          } else {
            setError("An account with this email already exists. Please sign in instead.");
          }
        } else {
          setError("An account with this email already exists. Please sign in instead.");
        }
      } else {
        setError(authError.message);
      }
      setIsLoading(false);
      return;
    }

    // If user is created and session exists, create profile and redirect
    if (data.user && data.session) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.name,
        phone: form.phone || null,
        role,
      }, { onConflict: "id", ignoreDuplicates: true });

      setIsLoading(false);
      toast.success("Welcome to GlamHub! 🎉");
      router.push(role === "salon_owner" ? "/salon-owner/register" : "/");
      router.refresh();
    } else {
      // Email confirmation required
      setIsLoading(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center glass-card p-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Check your email!</h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            We sent a confirmation link to <span className="text-purple-300 font-medium">{form.email}</span>.<br />
            Click the link to activate your account.
          </p>
          <Link href="/auth/login"><Button className="w-full">Back to Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className={`absolute top-1/3 right-10 w-72 h-72 ${role === "salon_owner" ? "bg-amber-600/10" : "bg-pink-600/15"} rounded-full blur-[100px] pointer-events-none transition-all duration-500`} />
      <div className={`absolute bottom-1/3 left-10 w-72 h-72 ${role === "salon_owner" ? "bg-purple-600/15" : "bg-purple-600/10"} rounded-full blur-[100px] pointer-events-none transition-all duration-500`} />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500",
              role === "salon_owner" 
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30" 
                : "bg-gradient-to-br from-purple-400 to-pink-500 shadow-purple-500/30"
            )}>
              {role === "salon_owner" ? <Briefcase className="w-6 h-6 text-white" /> : <Scissors className="w-6 h-6 text-white" />}
            </div>
            <span className="text-2xl font-bold gradient-text">CuraStyl</span>
          </Link>
        </div>

        <div className={cn("glass-card p-8 transition-all duration-500",
          role === "salon_owner" ? "border-amber-500/20" : ""
        )}>
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-white/50 text-sm mb-6">Join thousands of beauty enthusiasts in Mumbai</p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["customer", "salon_owner"] as const).map((r) => {
              const isActive = role === r;
              let activeClass = "";
              let inactiveClass = "";
              
              if (r === "salon_owner") {
                activeClass = "border-amber-400 bg-amber-500/20 text-amber-300";
                inactiveClass = "border-white/10 text-white/50 hover:border-amber-500/30";
              } else {
                activeClass = "border-purple-400 bg-purple-500/20 text-purple-300";
                inactiveClass = "border-white/10 text-white/50 hover:border-purple-500/30";
              }

              return (
                <button key={r} id={`role-${r}`} type="button" onClick={() => setRole(r)}
                  className={cn("py-3 rounded-xl border text-sm font-medium transition-all duration-300",
                    isActive ? activeClass : inactiveClass)}>
                  {r === "customer" ? "👤 Customer" : "💼 Salon Owner"}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs text-white/50 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input id="reg-name" placeholder="Sneha Kulkarni" className="pl-9" value={form.name}
                  onChange={(e) => update("name", e.target.value)} autoComplete="name" required />
              </div>
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-xs text-white/50 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input id="reg-email" type="email" placeholder="you@example.com" className="pl-9"
                  value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required />
              </div>
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-xs text-white/50 mb-1.5">Phone <span className="text-white/25">(optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input id="reg-phone" type="tel" placeholder="+91 98765 43210" className="pl-9"
                  value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" />
              </div>
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs text-white/50 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input id="reg-password" type={showPass ? "text" : "password"} placeholder="Min 8 characters"
                  className="pl-9 pr-10" value={form.password} onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" aria-label="Toggle password">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={cn("flex-1 h-1 rounded-full transition-all duration-300", i <= strength ? strengthColors[strength] : "bg-white/10")} />
                    ))}
                  </div>
                  <p className={cn("text-xs", strength >= 3 ? "text-emerald-400" : strength === 2 ? "text-yellow-400" : "text-red-400")}>{strengthLabels[strength]}</p>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input id="reg-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className={cn("mt-0.5", role === "salon_owner" ? "accent-amber-500" : "accent-purple-500")} />
              <span className="text-xs text-white/50 leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className={role === "salon_owner" ? "text-amber-400 hover:text-amber-300" : "text-purple-400 hover:text-purple-300"}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className={role === "salon_owner" ? "text-amber-400 hover:text-amber-300" : "text-purple-400 hover:text-purple-300"}>Privacy Policy</Link>
              </span>
            </label>

            <Button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !agreed}
              className={cn(
                "w-full h-11 transition-all duration-300",
                role === "salon_owner"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
                  : ""
              )}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : role === "salon_owner" ? "Create Account & List Salon" : "Create Free Account"
              }
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <a href={`/api/auth/google?role=${role}`} id="google-register-btn"
            className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all w-full">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </a>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{" "}
            <Link
              href={role === "salon_owner" ? "/auth/salon-owner-login" : "/auth/login"}
              className={cn(
                "font-medium transition-colors",
                role === "salon_owner" ? "text-amber-400 hover:text-amber-300" : "text-purple-400 hover:text-purple-300"
              )}
            >
              Sign in
            </Link>
          </p>

          {/* Role-specific login hint */}
          {role === "salon_owner" ? (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-white/30 flex items-center justify-center gap-1">
                <Briefcase className="w-3 h-3" />
                Already a salon owner?{" "}
                <Link
                  href="/auth/salon-owner-login"
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  Sign in to your dashboard
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-white/30 flex items-center justify-center gap-1">
                <Briefcase className="w-3 h-3" />
                Are you a salon owner?{" "}
                <Link
                  href="/auth/salon-owner-login"
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
