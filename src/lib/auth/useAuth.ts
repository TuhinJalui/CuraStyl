"use client";

import { useEffect, useCallback, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/auth/store";
import type { User as Profile } from "@/types";

export function useAuth() {
  const {
    profile,
    isLoading,
    isInitialized,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();

  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;

    try {
      return createClient();
    } catch (error) {
      console.error("Supabase client initialization failed:", error);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // JWT expired or auth error - sign out silently
        if (error.code === "PGRST301" || error.code === "PGRST303" || error.message?.includes("JWT")) {
          console.warn("Session expired, signing out silently");
          await supabase.auth.signOut().catch(() => undefined);
          setProfile(null);
          return null;
        }

        console.error("Error fetching profile:", {
          message: error.message,
          code: error.code,
        });

        if (error.code !== "PGRST116") {
          setProfile(null);
        }
      } else if (data) {
        setProfile(data as Profile);
      }

      return data;
    },
    [supabase, setProfile]
  );

  useEffect(() => {
    if (isInitialized) return;

    if (!supabase) {
      setProfile(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    let isMounted = true;
    let timeoutId: number | undefined;

    const finishInitialization = () => {
      if (!isMounted) return;
      setLoading(false);
      setInitialized(true);
    };

    timeoutId = window.setTimeout(() => {
      finishInitialization();
    }, 1200);

    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) throw error;

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })
      .catch(async (error) => {
        console.error("Session/JWT check failed:", error);
        setProfile(null);
        await supabase.auth.signOut().catch(() => undefined);
      })
      .finally(() => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        finishInitialization();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          await fetchProfile(session.user.id);
        } catch (error) {
          console.error("Profile refresh failed:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      finishInitialization();
    });

    return () => {
      isMounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, [isInitialized, supabase, fetchProfile, setLoading, setInitialized, setProfile]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    reset();
    window.location.href = "/";
  }, [supabase, reset]);

  const updateUserProfile = useCallback(
    async (data: { full_name?: string; phone?: string; avatar_url?: string }) => {
      if (!profile || !supabase) return { error: "Not logged in" };

      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (!error) {
        setProfile({ ...profile, ...data });
      }

      return { error: error?.message ?? null };
    },
    [profile, supabase, setProfile]
  );

  return {
    profile,
    isLoading,
    isInitialized,
    isLoggedIn: !!profile,
    isAdmin: profile?.role === "admin",
    isSalonOwner: profile?.role === "salon_owner" || profile?.role === "admin",
    signOut,
    updateUserProfile,
  };
}
