import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";

const CONFIRM_TYPES = new Set([
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
  "email",
]);

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const requestedType = String(form.get("type") ?? "magiclink");
  const next = safeNextPath(form.get("next"), "/");

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, origin), 303);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return redirect("/auth/confirm?error=unavailable");
  if (!tokenHash || !CONFIRM_TYPES.has(requestedType)) {
    return redirect("/auth/confirm?error=invalid");
  }

  // Route through /auth/callback so first-time onboarding is checked the same
  // way as GitHub OAuth, instead of jumping straight to `next`.
  const callback = `/auth/callback?${new URLSearchParams({ next })}`;
  const response = NextResponse.redirect(new URL(callback, origin), 303);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: requestedType as EmailOtpType,
  });
  if (error) return redirect("/auth/confirm?error=expired");
  return response;
}
