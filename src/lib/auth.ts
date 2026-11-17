import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
);

const COOKIE_NAME = "admin_token";
const TOKEN_EXPIRY = "7d";

function resolveAuthCookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  return appUrl.startsWith("https://");
}

export function getAuthCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: resolveAuthCookieSecure(),
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export interface JWTPayload {
  adminId: string;
  email: string;
  name: string;
  tokenVersion: number;
}

export function extractBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization?.trim()) return null;

  let value = authorization.trim();
  while (value.toLowerCase().startsWith("bearer ")) {
    value = value.slice(7).trim();
  }

  return value || null;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
