import { createMqttAuthToken, type MqttAuthRole } from "@/lib/mqtt/auth-token";
import { clearRetainedMqttMessage, publishMqttMessage } from "@/lib/mqtt/client";
import {
  getMqttPublicBrokerUrl,
  getMqttPublicWsUrl,
  isMqttAnonymousAllowed,
  MOBILE_LOCATION_INTERVAL_SEC,
} from "@/lib/mqtt/config";
import {
  huntEndTopic,
  huntLiveStatsTopic,
  huntPlayerLocationTopic,
  huntPlayerPrizeTopic,
  huntPlayerAdminMessageTopic,
  huntPlayerPositionsTopic,
  huntStartTopic,
  HUNT_END_SUBSCRIBE,
  HUNT_LIVE_SUBSCRIBE,
  HUNT_START_SUBSCRIBE,
} from "@/lib/mqtt/topics";

const GLOBAL_PLAYER_LISTENER_HUNT_ID = "global";

export type HuntMqttConnectionInfo = {
  brokerUrl: string;
  wsUrl: string;
  clientId: string;
  username: string;
  password: string | null;
  topics: {
    live: string;
    start: string;
    end: string;
    location: string | null;
    /** Winner prize events (`claim_now` / `claimed`) — only meaningful for that device */
    prize: string | null;
    /** Joined-player admin broadcast (`admin_message`) — subscribe after join */
    adminMessage: string | null;
    /**
     * Admin-only retained live map snapshot (`event: positions`).
     * Null for player MQTT — players must not receive every other user's GPS.
     */
    positions: string | null;
  };
  locationIntervalSec: number;
};

type BuildMqttConnectionInput = {
  huntId: string;
  role: MqttAuthRole;
  deviceId?: string;
};

export async function buildPlayerHuntMqttForDevice(
  huntId: string,
  deviceId: string,
): Promise<HuntMqttConnectionInfo> {
  return buildHuntMqttConnectionInfo({
    huntId,
    role: "player",
    deviceId,
  });
}

export async function buildPlayerIdleMqttForDevice(
  deviceId: string,
): Promise<HuntMqttConnectionInfo> {
  const password = isMqttAnonymousAllowed()
    ? null
    : await createMqttAuthToken({
        huntId: GLOBAL_PLAYER_LISTENER_HUNT_ID,
        role: "player",
        deviceId,
      });

  return {
    brokerUrl: getMqttPublicBrokerUrl(),
    wsUrl: getMqttPublicWsUrl(),
    clientId: `player-${deviceId}`,
    username: deviceId,
    password,
    topics: {
      live: HUNT_LIVE_SUBSCRIBE,
      start: HUNT_START_SUBSCRIBE,
      end: HUNT_END_SUBSCRIBE,
      location: null,
      prize: null,
      adminMessage: null,
      positions: null,
    },
    locationIntervalSec: MOBILE_LOCATION_INTERVAL_SEC,
  };
}

export async function resolveActiveApiMqtt(
  hunt: { id: string } | null,
  todayScheduled: Array<{ mqtt: HuntMqttConnectionInfo }>,
  deviceId: string,
): Promise<HuntMqttConnectionInfo> {
  if (hunt) {
    return buildPlayerHuntMqttForDevice(hunt.id, deviceId);
  }

  if (todayScheduled[0]?.mqtt) {
    return todayScheduled[0].mqtt;
  }

  return buildPlayerIdleMqttForDevice(deviceId);
}

export async function attachPlayerMqttToHunts<T extends { id: string }>(
  hunts: T[],
  deviceId: string,
): Promise<Array<T & { mqtt: HuntMqttConnectionInfo }>> {
  return Promise.all(
    hunts.map(async (hunt) => ({
      ...hunt,
      mqtt: await buildPlayerHuntMqttForDevice(hunt.id, deviceId),
    })),
  );
}

export async function buildHuntMqttConnectionInfo(
  input: BuildMqttConnectionInput,
): Promise<HuntMqttConnectionInfo> {
  const { huntId, role, deviceId } = input;

  const clientId =
    role === "player" && deviceId
      ? `player-${deviceId}`
      : `admin-${huntId}-${Date.now()}`;

  const username = role === "player" && deviceId ? deviceId : "admin";
  const password = isMqttAnonymousAllowed()
    ? null
    : await createMqttAuthToken({
        huntId,
        role,
        deviceId,
      });

  return {
    brokerUrl: getMqttPublicBrokerUrl(),
    wsUrl: getMqttPublicWsUrl(),
    clientId,
    username,
    password,
    topics: {
      live: huntLiveStatsTopic(huntId),
      start: huntStartTopic(huntId),
      end: huntEndTopic(huntId),
      location:
        role === "player" && deviceId
          ? huntPlayerLocationTopic(huntId, deviceId)
          : null,
      prize:
        role === "player" && deviceId
          ? huntPlayerPrizeTopic(huntId, deviceId)
          : null,
      adminMessage:
        role === "player" && deviceId
          ? huntPlayerAdminMessageTopic(huntId, deviceId)
          : null,
      positions: role === "admin" ? huntPlayerPositionsTopic(huntId) : null,
    },
    locationIntervalSec: MOBILE_LOCATION_INTERVAL_SEC,
  };
}

export async function initializeStartedHuntLive(huntId: string): Promise<void> {
  try {
    await clearRetainedMqttMessage(huntEndTopic(huntId));
  } catch (error) {
    console.error(`[mqtt] Failed to clear ended topic for hunt ${huntId}:`, error);
  }

  try {
    const { initializeHuntLiveState } = await import("@/lib/mqtt/live-state");
    await initializeHuntLiveState(huntId);
  } catch (error) {
    console.error(`[mqtt] Failed to initialize live state for hunt ${huntId}:`, error);
  }

  await notifyHuntStartedMqtt(huntId, new Date());
}

export async function clearHuntLive(huntId: string): Promise<void> {
  try {
    const { clearHuntLiveState } = await import("@/lib/mqtt/live-state");
    await clearHuntLiveState(huntId);
  } catch (error) {
    console.error(`[mqtt] Failed to clear live state for hunt ${huntId}:`, error);
  }
}

export async function clearHuntsLive(huntIds: string[]): Promise<void> {
  await Promise.all(huntIds.map((huntId) => clearHuntLive(huntId)));
}

export async function notifyHuntStartedMqtt(huntId: string, startedAt: Date): Promise<void> {
  try {
    await publishMqttMessage(
      huntStartTopic(huntId),
      {
        huntId,
        status: "started",
        started: true,
        startedAt: startedAt.toISOString(),
      },
      { retain: true, qos: 1 },
    );
  } catch (error) {
    console.error(`[mqtt] Failed to publish hunt started event for hunt ${huntId}:`, error);
  }
}

export async function notifyHuntEnded(huntId: string, endedAt: Date): Promise<void> {
  try {
    await clearRetainedMqttMessage(huntStartTopic(huntId));
    await publishMqttMessage(
      huntEndTopic(huntId),
      {
        huntId,
        status: "ended",
        ended: true,
        endedAt: endedAt.toISOString(),
      },
      { retain: true, qos: 1 },
    );
  } catch (error) {
    console.error(`[mqtt] Failed to publish hunt ended event for hunt ${huntId}:`, error);
  }
}

export async function notifyPlayerJoined(huntId: string, isNew: boolean): Promise<void> {
  try {
    const { incrementHuntJoinedCount, publishHuntLiveStats } = await import("@/lib/mqtt/live-state");

    if (isNew) {
      await incrementHuntJoinedCount(huntId);
    }

    await publishHuntLiveStats(huntId);
  } catch (error) {
    console.error(`[mqtt] Failed to publish join stats for hunt ${huntId}:`, error);
  }
}

export async function notifyPlayerScanned(huntId: string): Promise<void> {
  try {
    const { publishHuntLiveStats, syncHuntScanCountFromDb } = await import("@/lib/mqtt/live-state");

    await syncHuntScanCountFromDb(huntId);
    await publishHuntLiveStats(huntId);
  } catch (error) {
    console.error(`[mqtt] Failed to publish scan stats for hunt ${huntId}:`, error);
  }
}
