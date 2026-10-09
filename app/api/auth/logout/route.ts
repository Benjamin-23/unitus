import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/auth/redirects";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", requestOrigin(request)), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
