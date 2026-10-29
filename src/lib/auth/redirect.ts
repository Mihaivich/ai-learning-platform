/**
 * Only allow redirects back into this app. Absolute URLs, protocol-relative
 * URLs (`//evil.example`) and backslash variants (`/\evil.example`) all fall
 * back to the given path.
 */
export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "http://app.invalid");
    if (url.origin !== "http://app.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
