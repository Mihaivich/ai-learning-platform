"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { safeSignInReturn } from "@/lib/auth-redirect";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const params = new URLSearchParams(window.location.search);
    if (!supabase) {
      router.replace("/");
      return;
    }
    const providerError = params.get("error_description") ?? params.get("error");
    if (providerError) {
      setError(providerError);
      return;
    }
    const next = safeSignInReturn(params.get("next"));

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setError(
          "This sign-in link has expired or was opened in a different browser. Please sign in again.",
        );
        return;
      }

      let destination = next;
      try {
        const accountRes = await fetch("/api/me");
        if (accountRes.ok) {
          const account = await accountRes.json();
          if (!account.onboardingCompleted) {
            destination = `/onboarding?next=${encodeURIComponent(next)}`;
          }
        }
      } catch {
        // Fall through to the original destination if account lookup fails.
      }

      window.location.replace(destination);
    });
  }, [router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-white/70">
      {error ? (
        <>
          <p className="text-rose-300">Sign-in failed: {error}</p>
          <Link href="/login" className="mt-4 inline-block font-medium text-cyan-300 underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <p>Signing you in…</p>
      )}
    </div>
  );
}
