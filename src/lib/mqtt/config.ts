import { getMqttPublicWsUrlFromEnv } from "@/lib/mqtt/public-ws-url";

export const LIVE_PLAYER_TTL_SEC = 10;
export const MOBILE_LOCATION_INTERVAL_SEC = 3;

export function getMqttUrl(): string {
  return process.env.MQTT_URL?.trim() || "mqtt://localhost:1883";
}

export function isMqttConfigured(): boolean {
  return getMqttUrl() !== "";
}

export function getMqttPublicBrokerUrl(): string {
  return process.env.MQTT_PUBLIC_URL?.trim() || getMqttUrl();
}

export function getMqttPublicWsUrl(): string {
  return getMqttPublicWsUrlFromEnv();
}

export function isMqttAnonymousAllowed(): boolean {
  const value = process.env.MQTT_ALLOW_ANONYMOUS?.trim().toLowerCase();
  if (value === "false") return false;
  if (value === "true") return true;
  return process.env.NODE_ENV !== "production";
}
