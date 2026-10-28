import { cookies } from "next/headers";

import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  decodeCredentials,
  toAuthorizationHeader,
} from "./credentials";

export const DEFAULT_API_BASE_URL = "https://api.higgsfield.ai";

/** The key the studio signs requests with. A key entered in the studio (httpOnly
    cookie) wins; otherwise the server's own `HF_CREDENTIALS` (`key-id:key-secret`,
    from `.env.local`) is used. Neither value ever leaves the server. */
export async function readStoredCredentials(): Promise<{ apiKey: string } | null> {
  const jar = await cookies();
  const stored = decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value);
  if (stored) return stored;
  const fromEnv = process.env.HF_CREDENTIALS?.trim();
  if (!fromEnv) return null;
  try {
    toAuthorizationHeader(fromEnv);
  } catch {
    return null;
  }
  return { apiKey: fromEnv };
}

export async function readCredentials() {
  const stored = await readStoredCredentials();
  if (!stored) throw new MissingCredentialsError();
  return { ...stored, baseUrl: process.env.HF_API_BASE_URL || DEFAULT_API_BASE_URL };
}
