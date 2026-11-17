import { cookies, headers } from "next/headers";

import { verifyToken, JWTPayload, COOKIE_NAME, extractBearerToken } from "./auth";
import { prisma } from "./prisma";

async function resolveSession(token: string): Promise<JWTPayload | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const tokenVersion =
    typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { tokenVersion: true },
  });

  if (!admin || admin.tokenVersion !== tokenVersion) {
    return null;
  }

  return {
    adminId: payload.adminId,
    email: payload.email,
    name: payload.name,
    tokenVersion: admin.tokenVersion,
  };
}

export async function getSession(): Promise<JWTPayload | null> {
  const headerStore = await headers();
  const bearerToken = extractBearerToken(headerStore.get("authorization"));

  if (bearerToken) {
    return resolveSession(bearerToken);
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookieToken) return null;

  return resolveSession(cookieToken);
}
