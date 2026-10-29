/** Keep sign-in return paths on this application, including course activity context. */
export function safeSignInReturn(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, "https://devpath.invalid");
    return url.origin === "https://devpath.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
