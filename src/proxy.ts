import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, resolveDeviceId } from "./generation/device";

/* When APP_PASSWORD is set, every page, server action and API route asks for
   it (HTTP Basic; the user name is ignored). The server holds the platform key
   and every generation is billed to it, so a published copy must not be open to
   whoever finds the URL. Unset, the gate is off — fine for localhost. */
function authorized(request: NextRequest, password: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let given: string;
  try {
    const decoded = atob(header.slice(6));
    given = decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return false;
  }
  if (given.length !== password.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ password.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (password && !authorized(request, password)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Studio", charset="UTF-8"' },
    });
  }

  const { deviceId, minted } = resolveDeviceId(request.cookies.get(DEVICE_COOKIE)?.value);
  if (!minted) return NextResponse.next();
  const response = NextResponse.next();
  response.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
  return response;
}

/* The install files stay open: the browser fetches the manifest and worker
   without credentials, and an install that fails to read them never offers. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
