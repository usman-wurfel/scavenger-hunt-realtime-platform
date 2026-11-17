export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiOk } from "@/lib/api-response";
import { COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  await prisma.admin.update({
    where: { id: session!.adminId },
    data: { tokenVersion: { increment: 1 } },
  });

  const response = apiOk({ message: "Logged out successfully" });
  response.cookies.set(COOKIE_NAME, "", getAuthCookieOptions(0));
  return response;
}
