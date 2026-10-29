"use client";

import { usePathname } from "next/navigation";
import { ColorBends } from "./ColorBends";

/** Dark DevPath shell for product introduction, auth and project listings. */
export function PublicSurface({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const dark =
    path === "/" ||
    path === "/login" ||
    path === "/projects" ||
    path.startsWith("/auth/");

  if (!dark) return <>{children}</>;

  return (
    <div className="public-shell relative isolate min-h-dvh text-white">
      <div className="fixed inset-0 -z-10 bg-black">
        <ColorBends colors={["#0F172A", "#1E3A8A", "#3730A3", "#6D28D9"]} />
      </div>
      <div className="relative pt-16 lg:pt-28">{children}</div>
    </div>
  );
}
