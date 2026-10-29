"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useLearner } from "@/lib/learner-store";

const glow =
  "transition duration-300 hover:[text-shadow:0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(255,255,255,0.5)]";

const TONES = {
  dark: {
    header: "fixed inset-x-0 top-0 z-50 lg:top-8 lg:px-4",
    nav: "mx-auto flex items-center gap-4 border-b border-white/10 bg-white/[0.06] px-4 py-3 text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 lg:max-w-4xl lg:rounded-full lg:border lg:px-8 lg:py-3.5 lg:shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:backdrop-saturate-200",
    brand: `flex items-center gap-2.5 text-lg font-semibold text-white ${glow}`,
    link: `rounded-full px-2.5 py-1.5 font-medium text-white/75 hover:bg-white/10 hover:text-white ${glow} sm:px-3`,
    menu: "absolute right-0 z-30 mt-3 w-60 rounded-2xl border border-white/15 bg-zinc-900/90 p-2 text-white shadow-2xl backdrop-blur-xl",
    menuLink: "block rounded-lg px-3 py-2 text-white/80 hover:bg-white/10",
    email: "truncate px-3 py-2 text-xs text-white/45",
    avatar: "grid h-8 w-8 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white",
    caret: "text-xs text-white/50",
    summary: "hover:bg-white/10",
    signIn: "rounded-full bg-white px-4 py-1.5 font-medium text-black hover:bg-white/85",
  },
  light: {
    header: "sticky top-0 z-40 border-b border-stone-200/80 bg-white/85 backdrop-blur-xl",
    nav: "mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 text-stone-900",
    brand: "flex items-center gap-2.5 text-lg font-semibold text-stone-900",
    link: "rounded-full px-2.5 py-1.5 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 sm:px-3",
    menu: "absolute right-0 z-30 mt-3 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl",
    menuLink: "block rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100",
    email: "truncate px-3 py-2 text-xs text-stone-500",
    avatar: "grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700",
    caret: "text-xs text-stone-500",
    summary: "hover:bg-stone-100",
    signIn: "rounded-full bg-stone-900 px-4 py-1.5 font-medium text-white hover:bg-stone-700",
  },
} as const;

export type NavTone = keyof typeof TONES;

function defaultTone(pathname: string): NavTone {
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/projects" ||
    pathname.startsWith("/auth/")
  ) {
    return "dark";
  }
  return "light";
}

function loginHref(pathname: string) {
  if (pathname === "/login" || pathname.startsWith("/auth/")) return "/login";
  return `/login?next=${encodeURIComponent(pathname)}`;
}

/**
 * One navigation for both surfaces. Dark glass for the product landing and
 * project pages; light bar for the course learning surfaces.
 */
export function NavBar({ tone }: { tone?: NavTone }) {
  const pathname = usePathname() || "/";
  const { user, profile, signOut } = useLearner();
  const [isTeacher, setIsTeacher] = useState(false);
  const t = TONES[tone ?? defaultTone(pathname)];

  useEffect(() => {
    if (!user) {
      setIsTeacher(false);
      return;
    }
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((account) => {
        if (active) setIsTeacher(!!account?.isTeacher);
      })
      .catch(() => {
        if (active) setIsTeacher(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const initial = (profile?.displayName || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className={t.header}>
      <nav className={t.nav}>
        <Link href="/" className={t.brand}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-sm text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]">
            DP
          </span>
          <span className="hidden sm:inline">DevPath</span>
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-1 text-sm sm:gap-2 lg:text-[15px]">
          <Link href="/courses" className={t.link}>
            Courses
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className={`${t.link} hidden md:inline-block`}>
                My Learning
              </Link>
              <Link href="/my-courses" className={`${t.link} hidden lg:inline-block`}>
                My Creations
              </Link>
              {isTeacher && (
                <Link href="/teach" className={`${t.link} hidden lg:inline-block`}>
                  Teaching Studio
                </Link>
              )}
              <details className="relative">
                <summary
                  className={`flex cursor-pointer list-none items-center gap-2 rounded-full px-1 py-0.5 ${t.summary} [&::-webkit-details-marker]:hidden`}
                >
                  <span className={t.avatar}>{initial}</span>
                  <span aria-hidden className={t.caret}>
                    ▾
                  </span>
                </summary>
                <div className={t.menu}>
                  <p className={t.email}>{user.email}</p>
                  <Link href="/dashboard" className={`${t.menuLink} md:hidden`}>
                    My Learning
                  </Link>
                  <Link href="/my-courses" className={`${t.menuLink} lg:hidden`}>
                    My Creations
                  </Link>
                  {isTeacher ? (
                    <Link href="/teach" className={t.menuLink}>
                      Teaching Studio
                    </Link>
                  ) : (
                    <Link href="/onboarding?intent=teach" className={t.menuLink}>
                      Start Teaching
                    </Link>
                  )}
                  <Link href="/onboarding" className={t.menuLink}>
                    Profile & preferences
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className={`${t.menuLink} w-full text-left`}
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </>
          ) : (
            isSupabaseConfigured && (
              <Link href={loginHref(pathname)} className={t.signIn}>
                Sign in
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
