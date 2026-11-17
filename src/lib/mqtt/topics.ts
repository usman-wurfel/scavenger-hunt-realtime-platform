export const HUNT_LIVE_STATS_TOPIC = "hunts/{huntId}/live";
export const HUNT_START_TOPIC = "hunts/{huntId}/started";
export const HUNT_END_TOPIC = "hunts/{huntId}/ended";
export const HUNT_PLAYER_LOCATION_TOPIC = "hunts/{huntId}/players/{deviceId}/location";
export const HUNT_PLAYER_PRIZE_TOPIC = "hunts/{huntId}/players/{deviceId}/prize";
export const HUNT_PLAYER_POSITIONS_TOPIC = "hunts/{huntId}/positions";
export const HUNT_PLAYER_LOCATION_SUBSCRIBE = "hunts/+/players/+/location";
export const HUNT_LIVE_SUBSCRIBE = "hunts/+/live";
export const HUNT_START_SUBSCRIBE = "hunts/+/started";
export const HUNT_END_SUBSCRIBE = "hunts/+/ended";

export type HuntLiveStatsPayload = {
  totalJoined: number;
  scanCount: number;
  nearbyCount: number;
  updatedAt: string;
};

/** Compact live map snapshot — admin subscribe only (not every player device). */
export type HuntPlayerPositionsPayload = {
  event: "positions";
  huntId: string;
  at: string;
  count: number;
  players: Array<{ d: string; lat: number; lng: number }>;
};

export type WinnerPrizeMqttEvent = "claim_now" | "claimed";

export type HuntPlayerPrizePayload = {
  event: WinnerPrizeMqttEvent;
  huntId: string;
  huntName: string;
  participantId: string;
  username: string;
  deviceId: string;
  message?: string | null;
  status: "waiting" | "claimed";
  at: string;
};

export type HuntPlayerAdminMessagePayload = {
  event: "admin_message";
  huntId: string;
  huntName: string;
  participantId: string;
  username: string;
  deviceId: string;
  message: string;
  at: string;
};

export function huntLiveStatsTopic(huntId: string): string {
  return `hunts/${huntId}/live`;
}

/** Admin live map: retained snapshot of online joined players. */
export function huntPlayerPositionsTopic(huntId: string): string {
  return `hunts/${huntId}/positions`;
}

export function huntStartTopic(huntId: string): string {
  return `hunts/${huntId}/started`;
}

export function huntEndTopic(huntId: string): string {
  return `hunts/${huntId}/ended`;
}

export function huntPlayerLocationTopic(huntId: string, deviceId: string): string {
  return `hunts/${huntId}/players/${deviceId}/location`;
}

/** Winner-only prize events (`claim_now` / `claimed`) — subscribe with own deviceId. */
export function huntPlayerPrizeTopic(huntId: string, deviceId: string): string {
  return `hunts/${huntId}/players/${deviceId}/prize`;
}

/** Joined-player admin broadcast (`admin_message`) — subscribe with own deviceId after join. */
export function huntPlayerAdminMessageTopic(huntId: string, deviceId: string): string {
  return `hunts/${huntId}/players/${deviceId}/admin_message`;
}

export function parseHuntPlayerLocationTopic(topic: string): { huntId: string; deviceId: string } | null {
  const match = /^hunts\/([^/]+)\/players\/([^/]+)\/location$/.exec(topic);
  if (!match) return null;

  return {
    huntId: match[1],
    deviceId: match[2],
  };
}
