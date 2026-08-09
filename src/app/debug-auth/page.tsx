"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function DebugAuthPage() {
  const { profile, isLoading, isLoggedIn } = useAuth();
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">useAuth Hook</h2>
          <p>isLoading: {isLoading.toString()}</p>
          <p>isLoggedIn: {isLoggedIn.toString()}</p>
          <p>Profile: {profile ? JSON.stringify(profile, null, 2) : 'null'}</p>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Supabase Session</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(session, null, 2)}</pre>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">User Metadata</h2>
          <pre className="text-xs overflow-auto">
            {session?.user?.user_metadata ? JSON.stringify(session.user.user_metadata, null, 2) : 'No metadata'}
          </pre>
        </div>
      </div>
    </div>
  );
}
