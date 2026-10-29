import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from "@/generation/gate";

export async function POST(request: Request): Promise<NextResponse> {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.redirect(new URL("/", request.url), 303);

  const form = await request.formData();
  const given = String(form.get("password") ?? "");
  if (!safeEqual(given, password)) {
    /* A pause per wrong guess keeps a script from trying thousands a minute. */
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
