/** Browser-safe MQTT WebSocket URL (HTTPS pages require wss://). */
export function resolveBrowserMqttWsUrl(wsUrl: string): string | null {
  const trimmed = wsUrl.trim();
  if (!trimmed) return null;

  if (typeof window === "undefined") {
    return trimmed;
  }

  if (window.location.protocol !== "https:") {
    return trimmed;
  }

  if (trimmed.startsWith("wss://")) {
    return trimmed;
  }

  if (trimmed.startsWith("ws://")) {
    // Same-origin WSS — nginx should proxy /mqtt → EMQX :8083/mqtt
    return `wss://${window.location.host}/mqtt`;
  }

  return null;
}

export function getMqttPublicWsUrlFromEnv(): string {
  const configured = process.env.MQTT_PUBLIC_WS_URL?.trim() || "ws://localhost:8083/mqtt";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl?.startsWith("https://")) {
    return configured;
  }

  if (configured.startsWith("wss://")) {
    return configured;
  }

  try {
    const app = new URL(appUrl);
    return `wss://${app.host}/mqtt`;
  } catch {
    return configured.replace(/^ws:\/\//, "wss://");
  }
}
