// Signed session cookie (JWT, HS256). Server-only: reads SESSION_SECRET.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "unitus_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = { memberId: string; name?: string; email?: string };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set in .env (at least 32 characters)");
  return new TextEncoder().encode(value);
}

export async function signSession(session: Session) {
  return new SignJWT({ name: session.name, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.memberId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { memberId: payload.sub, name: payload.name as string | undefined, email: payload.email as string | undefined };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

/** Reads the session in a route handler. */
export async function getSession() {
  const { cookies } = await import("next/headers");
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
