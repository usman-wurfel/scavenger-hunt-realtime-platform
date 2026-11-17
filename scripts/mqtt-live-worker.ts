import mqtt from "mqtt";

import { closeMqttPublisher } from "@/lib/mqtt/client";
import {
  getMqttUrl,
  isMqttConfigured,
  LIVE_PLAYER_TTL_SEC,
  MOBILE_LOCATION_INTERVAL_SEC,
} from "@/lib/mqtt/config";
import {
  handleHuntPlayerLocationMessage,
  refreshAllHuntLiveStats,
} from "@/lib/mqtt/live-state";
import {
  HUNT_PLAYER_LOCATION_SUBSCRIBE,
  parseHuntPlayerLocationTopic,
} from "@/lib/mqtt/topics";
import { closeRedisClient, isLiveRedisConfigured } from "@/lib/redis/client";

async function main() {
  if (!isMqttConfigured()) {
    console.error("[mqtt-live-worker] MQTT_URL is not configured");
    process.exit(1);
  }

  if (!isLiveRedisConfigured()) {
    console.error("[mqtt-live-worker] REDIS_URL is not configured");
    process.exit(1);
  }

  const client = mqtt.connect(getMqttUrl(), {
    clientId: `scavenger-hunt-mqtt-worker-${process.pid}`,
    reconnectPeriod: 2_000,
    connectTimeout: 10_000,
    clean: true,
  });

  const refreshIntervalMs = Math.max(
    MOBILE_LOCATION_INTERVAL_SEC * 1000,
    Math.floor((LIVE_PLAYER_TTL_SEC * 1000) / 2),
  );
  const refreshTimer = setInterval(() => {
    refreshAllHuntLiveStats().catch((error) => {
      console.error("[mqtt-live-worker] Failed to refresh live stats:", error);
    });
  }, refreshIntervalMs);

  client.on("connect", () => {
    client.subscribe(HUNT_PLAYER_LOCATION_SUBSCRIBE, { qos: 0 }, (error) => {
      if (error) {
        console.error("[mqtt-live-worker] Subscription failed:", error);
        return;
      }

      console.log("[mqtt-live-worker] Listening for player location updates...");
    });
  });

  client.on("message", async (topic, payload) => {
    const parsed = parseHuntPlayerLocationTopic(topic);
    if (!parsed) return;

    try {
      await handleHuntPlayerLocationMessage(parsed.huntId, parsed.deviceId, payload);
    } catch (error) {
      console.error(
        `[mqtt-live-worker] Failed to process location for hunt ${parsed.huntId}:`,
        error,
      );
    }
  });

  client.on("error", (error) => {
    console.error("[mqtt-live-worker] MQTT error:", error);
  });

  async function shutdown() {
    clearInterval(refreshTimer);
    client.end(true);
    await closeMqttPublisher();
    await closeRedisClient();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[mqtt-live-worker] Startup failed:", error);
  process.exit(1);
});
