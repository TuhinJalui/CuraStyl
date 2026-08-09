"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, Eye, EyeOff, Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (authError) { setError(authError.message); }
    else { setDone(true); setTimeout(() => router.push("/auth/login"), 3000); }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">CuraStyl</span>
          </Link>
        </div>
        <div className="glass-card p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Password updated!</h2>
              <p className="text-white/50 text-sm mb-6">Redirecting you to sign in…</p>
              <Link href="/auth/login"><Button className="w-full">Sign In Now</Button></Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
              <p className="text-white/50 text-sm mb-8">Choose a strong password for your account.</p>
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs text-white/50 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input id="new-password" type={showPass ? "text" : "password"} placeholder="Min 8 characters"
                      className="pl-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60" aria-label="Toggle">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex gap-1 mt-2">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={cn("flex-1 h-1 rounded-full transition-all", i <= strength ? strengthColors[strength] : "bg-white/10")} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs text-white/50 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input id="confirm-password" type={showPass ? "text" : "password"} placeholder="Repeat your password"
                      className={cn("pl-9", confirm && password !== confirm && "border-red-500/50")}
                      value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  </div>
                  {confirm && password !== confirm && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
                </div>
                <Button id="reset-submit-btn" type="submit" disabled={isLoading || (!!confirm && password !== confirm)} className="w-full h-11">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
