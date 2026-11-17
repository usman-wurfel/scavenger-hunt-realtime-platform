import { prisma } from "@/lib/prisma";

export async function getAdminFcmTokens(): Promise<string[]> {
  const admins = await prisma.admin.findMany({
    where: {
      fcmToken: { not: null },
    },
    select: { fcmToken: true },
  });

  return [
    ...new Set(
      admins
        .map((admin) => admin.fcmToken?.trim())
        .filter((token): token is string => !!token),
    ),
  ];
}

export async function removeInvalidAdminFcmTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  await prisma.admin.updateMany({
    where: {
      fcmToken: { in: tokens },
    },
    data: {
      fcmToken: null,
    },
  });
}
