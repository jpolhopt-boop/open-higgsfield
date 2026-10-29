/* Shared by the proxy and the login route. The session cookie holds an HMAC of
   a fixed label keyed by APP_PASSWORD, so it proves the password was known
   without containing it, and changing the password signs every device out. */

export const SESSION_COOKIE = "ohf_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function sessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("ohf-session-v1"));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
