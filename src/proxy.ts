import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, resolveDeviceId } from "./generation/device";
import { SESSION_COOKIE, safeEqual, sessionToken } from "./generation/gate";

/* When APP_PASSWORD is set, every page, server action and API route needs it.
   The server holds the platform key and every generation is billed to it, so a
   published copy must not be open to whoever finds the URL. Unset, the gate is
   off — fine for localhost.

   Two ways in: the /login page, which sets a 30-day cookie (the only one that
   works from an iPhone home-screen app, which never shows a Basic prompt), and
   HTTP Basic (any user name) for tools like curl. */
async function authorized(request: NextRequest, password: string): Promise<boolean> {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(password))) return true;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    return safeEqual(decoded.slice(decoded.indexOf(":") + 1), password);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const { pathname } = request.nextUrl;
  const open = pathname === "/login" || pathname === "/api/login";
  if (password && !open && !(await authorized(request, password))) {
    const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
    if (wantsPage) return NextResponse.redirect(new URL("/login", request.url));
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
