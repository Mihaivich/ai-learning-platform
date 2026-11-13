"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserQuotaSummary } from "@/lib/ai/quota-shared";
import { useAuth } from "@/lib/auth-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const glow = "transition duration-300 hover:[text-shadow:0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(255,255,255,0.5)]";
const navLink = `rounded-full px-3 py-1.5 font-medium text-white/75 hover:text-white ${glow}`;
const menuLink = "block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white";

/**
 * A floating glass pill on wide screens and a full-width glass bar on smaller
 * ones. The bar is fixed, so the layout pads the page below it.
 */
export function NavBar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  // The account menu is a <details>, which only closes from its own summary; close it from outside too.
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      const details = menu.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !details.contains(event.target as Node)) details.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  // Close the dropdown when navigating to a new route.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  // Instructors get a link to their classes, administrators one to the admin page.
  const [role, setRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [genQuota, setGenQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const teacher = role === "instructor" || role === "admin";

  useEffect(() => {
    const supabase = getSupabase();
    if (!user || !supabase) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("role,display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRole(data?.role ?? null);
        setDisplayName(data?.display_name?.trim() || null);
      });

    fetch("/api/quota")
      .then((res) => (res.ok ? (res.json() as Promise<UserQuotaSummary>) : null))
      .then((summary) => {
        if (cancelled || !summary) return;
        const gen = summary.buckets.find((b) => b.bucket === "generation");
        if (gen) setGenQuota({ remaining: gen.remaining, limit: gen.limit });
      })
      .catch(() => {
        /* Non-blocking pill; silently ignore offline/unconfigured states */
      });

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  const labelSource = displayName || user?.email || "?";
  const initial = labelSource.trim().charAt(0).toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-50 lg:top-8 lg:px-4">
      <nav className="mx-auto flex items-center gap-4 border-b border-white/10 bg-white/[0.06] px-4 py-3 text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 lg:max-w-4xl lg:rounded-full lg:border lg:px-8 lg:py-3.5 lg:shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:backdrop-saturate-200">
        <Link href="/" className={`flex items-center gap-2.5 text-lg font-semibold text-white ${glow}`}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-sm text-white shadow-[0_0_16px_rgba(99,102,241,0.6)]">
            DP
          </span>
          <span className="hidden sm:inline">DevPath</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 text-sm sm:gap-3 lg:text-[15px]">
          <Link href="/projects" className={navLink}>
            Courses
          </Link>
          <Link href="/projects/new" className={navLink}>
            Create
          </Link>
          {user && teacher && (
            <Link href="/teach" className={navLink}>
              Teach
            </Link>
          )}
          {user && role === "admin" && (
            <Link href="/admin" className={navLink}>
              Admin
            </Link>
          )}
          {user ? (
            <details ref={menu} className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-1 py-0.5 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white">
                  {initial}
                </span>
                <span aria-hidden className="text-xs text-white/50">
                  ▾
                </span>
              </summary>
              <div className="absolute right-0 z-30 mt-3 w-64 rounded-2xl border border-white/15 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/10 px-3 py-2">
                  {displayName && <p className="truncate text-sm font-semibold text-white">{displayName}</p>}
                  <p className="truncate text-xs text-white/45">{user.email}</p>
                  {genQuota && (
                    <Link
                      href="/profile#quota"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[11px] text-cyan-100 hover:bg-cyan-400/20"
                    >
                      <span>AI Quota · {genQuota.remaining}/{genQuota.limit} gen left</span>
                    </Link>
                  )}
                </div>

                <div className="mt-1 space-y-0.5">
                  <Link href="/profile" className={menuLink}>
                    Profile &amp; Quota
                  </Link>
                  <button type="button" onClick={() => void signOut()} className={`${menuLink} w-full text-left`}>
                    Sign out
                  </button>
                </div>
              </div>
            </details>
          ) : (
            isSupabaseConfigured && (
              <Link href="/login" className="rounded-full bg-white px-4 py-1.5 font-medium text-black hover:bg-white/85">
                Sign in
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
