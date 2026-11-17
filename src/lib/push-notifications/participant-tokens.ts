import { prisma } from "@/lib/prisma";

const PAGE_SIZE_DEFAULT = 1000;

export async function getParticipantFcmTokens(): Promise<string[]> {
  const tokens: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await getParticipantFcmTokenPage({ cursor, take: PAGE_SIZE_DEFAULT });
    tokens.push(...page.tokens);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return [...new Set(tokens)];
}

/**
 * Cursor-paginated unique FCM tokens for scalable fan-out (thousands of devices).
 */
export async function getParticipantFcmTokenPage(input?: {
  cursor?: string;
  take?: number;
  areaId?: string | null;
}): Promise<{ tokens: string[]; nextCursor?: string }> {
  const take = input?.take ?? PAGE_SIZE_DEFAULT;

  if (input?.areaId) {
    const subscriptions = await prisma.playerAreaSubscription.findMany({
      where: {
        areaId: input.areaId,
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
      },
      select: { id: true, deviceId: true },
      orderBy: { id: "asc" },
      take,
    });
    const devices = await prisma.participantDevice.findMany({
      where: {
        deviceId: { in: subscriptions.map((row) => row.deviceId) },
        fcmToken: { not: null },
      },
      select: { fcmToken: true },
    });
    const tokens = [
      ...new Set(
        devices
          .map((device) => device.fcmToken?.trim())
          .filter((token): token is string => !!token),
      ),
    ];
    const last = subscriptions[subscriptions.length - 1];
    return {
      tokens,
      nextCursor:
        subscriptions.length === take && last ? last.id : undefined,
    };
  }

  const devices = await prisma.participantDevice.findMany({
    where: {
      fcmToken: { not: null },
      ...(input?.cursor ? { id: { gt: input.cursor } } : {}),
    },
    select: { id: true, fcmToken: true },
    orderBy: { id: "asc" },
    take,
  });

  const tokens = [
    ...new Set(
      devices
        .map((device) => device.fcmToken?.trim())
        .filter((token): token is string => !!token),
    ),
  ];

  const last = devices[devices.length - 1];
  return {
    tokens,
    nextCursor: devices.length === take && last ? last.id : undefined,
  };
}

export async function getHuntJoinedTargetsPage(input: {
  huntId: string;
  cursor?: string;
  take?: number;
}): Promise<{
  targets: Array<{
    participantId: string;
    deviceId: string;
    username: string;
    fcmTokens: string[];
  }>;
  nextCursor?: string;
}> {
  const take = input.take ?? PAGE_SIZE_DEFAULT;

  const participants = await prisma.huntParticipant.findMany({
    where: {
      eventId: input.huntId,
      ...(input.cursor ? { id: { gt: input.cursor } } : {}),
    },
    select: { id: true, deviceId: true, username: true },
    orderBy: { id: "asc" },
    take,
  });

  if (participants.length === 0) {
    return { targets: [] };
  }

  const deviceIds = participants.map((participant) => participant.deviceId);
  const participantIds = participants.map((participant) => participant.id);

  const devices = await prisma.participantDevice.findMany({
    where: {
      fcmToken: { not: null },
      OR: [
        { deviceId: { in: deviceIds } },
        { participantId: { in: participantIds } },
      ],
    },
    select: { deviceId: true, participantId: true, fcmToken: true },
  });

  const tokensByDevice = new Map<string, Set<string>>();
  for (const device of devices) {
    const token = device.fcmToken?.trim();
    if (!token) continue;

    if (device.deviceId) {
      const existing = tokensByDevice.get(device.deviceId) ?? new Set<string>();
      existing.add(token);
      tokensByDevice.set(device.deviceId, existing);
    }

    if (device.participantId) {
      const participant = participants.find((row) => row.id === device.participantId);
      if (participant) {
        const existing = tokensByDevice.get(participant.deviceId) ?? new Set<string>();
        existing.add(token);
        tokensByDevice.set(participant.deviceId, existing);
      }
    }
  }

  const targets = participants.map((participant) => ({
    participantId: participant.id,
    deviceId: participant.deviceId,
    username: participant.username,
    fcmTokens: [...(tokensByDevice.get(participant.deviceId) ?? new Set<string>())],
  }));

  const last = participants[participants.length - 1];
  return {
    targets,
    nextCursor: participants.length === take && last ? last.id : undefined,
  };
}

/** @deprecated Use paginated getHuntJoinedTargetsPage for large hunts. */
export async function getHuntParticipantFcmTokens(huntId: string): Promise<string[]> {
  const tokens: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await getHuntJoinedTargetsPage({ huntId, cursor, take: PAGE_SIZE_DEFAULT });
    tokens.push(...page.targets.flatMap((target) => target.fcmTokens));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return [...new Set(tokens)];
}

export async function removeInvalidParticipantFcmTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  await prisma.participantDevice.deleteMany({
    where: {
      fcmToken: { in: tokens },
    },
  });
}
