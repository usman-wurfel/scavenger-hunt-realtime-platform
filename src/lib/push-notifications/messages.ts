export type HuntPushEventType = "hunt_started" | "hunt_ended" | "hunt_starting_soon";

export type HuntPushPayload = {
  type: HuntPushEventType;
  huntId: string;
  huntName: string;
  /** Present for hunt_starting_soon — minutes until start at send time. */
  minutesUntilStart?: number;
};

/** FCM multicast hard limit is 500 tokens per request. */
export const FCM_BATCH_SIZE = 500;

/** Pause between sequential multicast batches (normal priority). */
export const FCM_BATCH_PAUSE_MS = 75;

/** Parallel FCM multicasts for urgent 5-minute fan-out (~5k tokens finishes in seconds). */
export const FCM_URGENT_CONCURRENCY = 5;

export function chunkFcmTokens(tokens: string[], size = FCM_BATCH_SIZE): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < tokens.length; index += size) {
    chunks.push(tokens.slice(index, index + size));
  }

  return chunks;
}

export function formatMinutesLabel(minutes: number): string {
  const safe = Math.max(1, Math.round(minutes));
  return safe === 1 ? "1 minute" : `${safe} minutes`;
}

export function buildHuntPushContent(payload: HuntPushPayload): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  if (payload.type === "hunt_started") {
    return {
      title: "Hunt Started",
      body: `${payload.huntName} has started. Open the app and join now!`,
      data: {
        type: payload.type,
        huntId: payload.huntId,
        huntName: payload.huntName,
      },
    };
  }

  if (payload.type === "hunt_starting_soon") {
    const minutes = Math.max(1, payload.minutesUntilStart ?? 30);
    return {
      title: "Hunt Starting Soon",
      body: `${payload.huntName} will start in ${formatMinutesLabel(minutes)}. Get ready!`,
      data: {
        type: payload.type,
        huntId: payload.huntId,
        huntName: payload.huntName,
        minutesUntilStart: String(minutes),
      },
    };
  }

  return {
    title: "Hunt Completed",
    body: `${payload.huntName} hunt has completed. Thank you for playing, stay tuned for the next one.`,
    data: {
      type: payload.type,
      huntId: payload.huntId,
      huntName: payload.huntName,
    },
  };
}
