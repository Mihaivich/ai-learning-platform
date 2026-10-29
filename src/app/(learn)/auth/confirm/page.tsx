import Link from "next/link";
import { glass } from "@/components/home/glass";
import { safeNextPath } from "@/lib/auth/redirect";

const CONFIRM_TYPES = new Set([
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
  "email",
]);

const ERRORS: Record<string, string> = {
  expired:
    "This sign-in link has already been used or has expired. Sign-in links work once and expire after a short time.",
  invalid: "This sign-in link is not valid. Request a new one and try again.",
  unavailable: "Sign-in is not configured on this deployment yet.",
  default: "We couldn't sign you in. Request a new link and try again.",
};

type ConfirmParams = {
  token_hash?: string | string[];
  type?: string | string[];
  next?: string | string[];
  error?: string | string[];
};

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<ConfirmParams>;
}) {
  const params = await searchParams;
  const tokenHash = single(params.token_hash);
  const requestedType = single(params.type);
  const type = CONFIRM_TYPES.has(requestedType) ? requestedType : "magiclink";
  const next = safeNextPath(single(params.next));
  const errorKey = single(params.error);
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.default) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className={`${glass} p-7 text-center shadow-2xl sm:p-8`}>
        {error ? (
          <>
            <h1 className="text-2xl font-bold">Link not usable</h1>
            <p className="mt-3 text-white/70">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/85"
            >
              Request a new link
            </Link>
          </>
        ) : !tokenHash ? (
          <>
            <h1 className="text-2xl font-bold">Link not usable</h1>
            <p className="mt-3 text-white/70">{ERRORS.invalid}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/85"
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Ready to sign in</h1>
            <p className="mt-2 text-white/60">
              Confirm this email link to continue to DevPath.
            </p>
            <form method="post" action="/auth/confirm/verify" className="mt-6">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="w-full rounded-full bg-white px-5 py-3 font-medium text-black hover:bg-white/85"
              >
                Sign in to DevPath
              </button>
            </form>
            <p className="mt-4 text-xs text-white/40">
              The button only works when you press it, so email link previews cannot use
              up your sign-in link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
