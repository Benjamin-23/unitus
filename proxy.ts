import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/auth/redirects";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// Optimistic check: send signed-out visitors to the login page before member
// pages render. API routes still verify the session themselves.
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const login = new URL("/login", requestOrigin(request));
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/groups/:path*"],
};
