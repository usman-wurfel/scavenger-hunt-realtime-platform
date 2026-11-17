import { EventStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getRedisClient, isLiveRedisConfigured } from "@/lib/redis/client";
import { clearRetainedMqttMessage, publishMqttMessage } from "@/lib/mqtt/client";
import { LIVE_PLAYER_TTL_SEC } from "@/lib/mqtt/config";
import { distanceFeet } from "@/lib/mqtt/geo";
import {
  huntLiveStatsTopic,
  huntPlayerPositionsTopic,
  type HuntLiveStatsPayload,
  type HuntPlayerPositionsPayload,
} from "@/lib/mqtt/topics";
import { getOrCreateSettings } from "@/lib/settings";

type HuntLiveMeta = {
  lat: number;
  lng: number;
  radiusFt: number;
};

function huntMetaKey(huntId: string): string {
  return `hunt:${huntId}:meta`;
}

function huntTotalJoinedKey(huntId: string): string {
  return `hunt:${huntId}:totalJoined`;
}

function huntScanCountKey(huntId: string): string {
  return `hunt:${huntId}:scanCount`;
}

function huntGeoKey(huntId: string): string {
  return `hunt:${huntId}:geo`;
}

function huntSeenKey(huntId: string, deviceId: string): string {
  return `hunt:${huntId}:seen:${deviceId}`;
}

function huntLiveKeyPattern(huntId: string): string {
  return `hunt:${huntId}:*`;
}

function allHuntMetaKeyPattern(): string {
  return "hunt:*:meta";
}

function parseHuntIdFromMetaKey(key: string): string | null {
  const match = /^hunt:(.+):meta$/.exec(key);
  return match?.[1] ?? null;
}

function parseLocationPayload(payload: Buffer): { lat: number; lng: number } | null {
  try {
    const parsed = JSON.parse(payload.toString("utf8")) as { lat?: unknown; lng?: unknown };
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };
  } catch {
    return null;
  }
}

async function readHuntMeta(huntId: string): Promise<HuntLiveMeta | null> {
  const redis = getRedisClient();
  const raw = await redis.get(huntMetaKey(huntId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as HuntLiveMeta;
    if (
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng) ||
      !Number.isFinite(parsed.radiusFt)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function getTotalJoined(huntId: string): Promise<number> {
  const redis = getRedisClient();
  const value = await redis.get(huntTotalJoinedKey(huntId));
  return value ? Number(value) || 0 : 0;
}

export async function syncHuntScanCountFromDb(huntId: string): Promise<number> {
  if (!isLiveRedisConfigured()) return 0;

  const count = await prisma.huntParticipant.count({
    where: { eventId: huntId, scanRank: { not: null } },
  });

  const redis = getRedisClient();
  await redis.set(huntScanCountKey(huntId), String(count));
  return count;
}

async function getScanCount(huntId: string): Promise<number> {
  if (!isLiveRedisConfigured()) return 0;

  const redis = getRedisClient();
  const cached = await redis.get(huntScanCountKey(huntId));
  const redisCount = cached !== null ? Number(cached) || 0 : null;

  if (redisCount !== null && redisCount > 0) {
    return redisCount;
  }

  const dbCount = await prisma.huntParticipant.count({
    where: { eventId: huntId, scanRank: { not: null } },
  });

  if (dbCount !== (redisCount ?? 0)) {
    await redis.set(huntScanCountKey(huntId), String(dbCount));
  }

  return dbCount;
}

type OnlinePlayerPosition = { d: string; lat: number; lng: number };

function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

async function listOnlinePlayerPositions(huntId: string): Promise<OnlinePlayerPosition[]> {
  const redis = getRedisClient();
  const geoKey = huntGeoKey(huntId);
  const members = await redis.zrange(geoKey, 0, -1);
  if (members.length === 0) return [];

  const [positions, seenFlags] = await Promise.all([
    redis.geopos(geoKey, ...members),
    redis.mget(...members.map((deviceId) => huntSeenKey(huntId, deviceId))),
  ]);

  const online: OnlinePlayerPosition[] = [];
  const staleMembers: string[] = [];

  for (let i = 0; i < members.length; i += 1) {
    if (seenFlags[i] === null) {
      staleMembers.push(members[i]!);
      continue;
    }

    const coords = positions[i];
    if (!coords || coords[0] === null || coords[1] === null) continue;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    online.push({ d: members[i]!, lat: roundCoord(lat), lng: roundCoord(lng) });
  }

  if (staleMembers.length > 0) {
    redis.zrem(geoKey, ...staleMembers).catch(() => {});
  }

  return online;
}

async function countNearbyPlayers(huntId: string, meta: HuntLiveMeta): Promise<number> {
  const players = await listOnlinePlayerPositions(huntId);
  let nearbyCount = 0;
  for (const player of players) {
    if (distanceFeet(player.lat, player.lng, meta.lat, meta.lng) <= meta.radiusFt) {
      nearbyCount += 1;
    }
  }
  return nearbyCount;
}

export async function buildHuntPlayerPositions(huntId: string): Promise<HuntPlayerPositionsPayload> {
  const players = isLiveRedisConfigured() ? await listOnlinePlayerPositions(huntId) : [];
  return {
    event: "positions",
    huntId,
    at: new Date().toISOString(),
    count: players.length,
    players,
  };
}

export async function publishHuntPlayerPositions(
  huntId: string,
  payload?: HuntPlayerPositionsPayload,
): Promise<void> {
  const body = payload ?? (await buildHuntPlayerPositions(huntId));
  await publishMqttMessage(huntPlayerPositionsTopic(huntId), body, {
    retain: true,
    qos: 0,
  });
}

export async function buildHuntLiveStats(huntId: string): Promise<HuntLiveStatsPayload> {
  const meta = await readHuntMeta(huntId);
  const totalJoined = await getTotalJoined(huntId);
  const scanCount = await getScanCount(huntId);
  const nearbyCount = meta ? await countNearbyPlayers(huntId, meta) : 0;

  return {
    totalJoined,
    scanCount,
    nearbyCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishHuntLiveStats(
  huntId: string,
  stats?: HuntLiveStatsPayload,
): Promise<void> {
  const payload = stats ?? (await buildHuntLiveStats(huntId));

  await publishMqttMessage(huntLiveStatsTopic(huntId), payload, {
    retain: true,
    qos: 1,
  });
}

export async function refreshAllHuntLiveStats(): Promise<void> {
  if (!isLiveRedisConfigured()) return;

  const redis = getRedisClient();
  const metaKeys = await redis.keys(allHuntMetaKeyPattern());
  if (metaKeys.length === 0) return;

  await Promise.all(
    metaKeys.map(async (metaKey) => {
      const huntId = parseHuntIdFromMetaKey(metaKey);
      if (!huntId) return;

      const [meta, totalJoined, scanCount, players] = await Promise.all([
        readHuntMeta(huntId),
        getTotalJoined(huntId),
        getScanCount(huntId),
        listOnlinePlayerPositions(huntId),
      ]);

      let nearbyCount = 0;
      if (meta) {
        for (const player of players) {
          if (distanceFeet(player.lat, player.lng, meta.lat, meta.lng) <= meta.radiusFt) {
            nearbyCount += 1;
          }
        }
      }

      const at = new Date().toISOString();
      await Promise.all([
        publishHuntLiveStats(huntId, {
          totalJoined,
          scanCount,
          nearbyCount,
          updatedAt: at,
        }),
        publishHuntPlayerPositions(huntId, {
          event: "positions",
          huntId,
          at,
          count: players.length,
          players,
        }),
      ]);
    }),
  );
}

export async function initializeHuntLiveState(huntId: string): Promise<void> {
  if (!isLiveRedisConfigured()) return;

  const hunt = await prisma.huntEvent.findUnique({
    where: { id: huntId },
    select: {
      id: true,
      status: true,
      latitude: true,
      longitude: true,
      playerNearbyRadius: true,
      _count: {
        select: {
          participants: true,
        },
      },
      participants: {
        where: {
          scanRank: { not: null },
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!hunt || hunt.status !== EventStatus.STARTED) return;

  const settings = await getOrCreateSettings();
  const meta: HuntLiveMeta = {
    lat: hunt.latitude,
    lng: hunt.longitude,
    radiusFt: hunt.playerNearbyRadius ?? settings.playerNearbyRadius,
  };

  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  pipeline.set(huntMetaKey(huntId), JSON.stringify(meta));
  pipeline.set(huntTotalJoinedKey(huntId), String(hunt._count.participants));
  pipeline.set(huntScanCountKey(huntId), String(hunt.participants.length));
  pipeline.del(huntGeoKey(huntId));
  await pipeline.exec();

  await publishHuntLiveStats(huntId, {
    totalJoined: hunt._count.participants,
    scanCount: hunt.participants.length,
    nearbyCount: 0,
    updatedAt: new Date().toISOString(),
  });
  await publishHuntPlayerPositions(huntId, {
    event: "positions",
    huntId,
    at: new Date().toISOString(),
    count: 0,
    players: [],
  });
}

export async function clearHuntLiveState(huntId: string): Promise<void> {
  if (!isLiveRedisConfigured()) {
    await Promise.all([
      clearRetainedMqttMessage(huntLiveStatsTopic(huntId)),
      clearRetainedMqttMessage(huntPlayerPositionsTopic(huntId)),
    ]);
    return;
  }

  const redis = getRedisClient();
  const keys = await redis.keys(huntLiveKeyPattern(huntId));
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  await Promise.all([
    clearRetainedMqttMessage(huntLiveStatsTopic(huntId)),
    clearRetainedMqttMessage(huntPlayerPositionsTopic(huntId)),
  ]);
}

export async function incrementHuntJoinedCount(huntId: string): Promise<number> {
  if (!isLiveRedisConfigured()) return 0;

  const redis = getRedisClient();
  const metaExists = await redis.exists(huntMetaKey(huntId));
  if (!metaExists) {
    await initializeHuntLiveState(huntId);
  }

  return redis.incr(huntTotalJoinedKey(huntId));
}

export async function incrementHuntScanCount(huntId: string): Promise<number> {
  if (!isLiveRedisConfigured()) return 0;

  const redis = getRedisClient();
  const metaExists = await redis.exists(huntMetaKey(huntId));
  if (!metaExists) {
    await initializeHuntLiveState(huntId);
  }

  return redis.incr(huntScanCountKey(huntId));
}

export async function handleHuntPlayerLocationMessage(
  huntId: string,
  deviceId: string,
  payload: Buffer,
): Promise<void> {
  if (!isLiveRedisConfigured()) return;

  const meta = await readHuntMeta(huntId);
  if (!meta) return;

  const location = parseLocationPayload(payload);
  if (!location) return;

  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  pipeline.geoadd(huntGeoKey(huntId), location.lng, location.lat, deviceId);
  pipeline.set(huntSeenKey(huntId, deviceId), "1", "EX", LIVE_PLAYER_TTL_SEC);
  await pipeline.exec();

  // NOTE: live stats are NOT published here on purpose. Publishing on every
  // single location update would recompute + broadcast stats N times per
  // interval (O(N^2) for the whole hunt). The mqtt-live-worker refresh timer
  // publishes stats periodically for all active hunts instead, which keeps the
  // ~3s update cadence while scaling to thousands of players.
}

export { parseLocationPayload };
