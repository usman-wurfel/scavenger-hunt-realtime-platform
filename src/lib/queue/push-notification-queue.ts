import { Queue } from "bullmq";

import type { HuntPushPayload } from "@/lib/push-notifications/messages";

import { getRedisConnectionOptions, isRedisConfigured } from "./redis";

export const PUSH_NOTIFICATION_QUEUE_NAME = "push-notifications";
export const PUSH_NOTIFICATION_JOB_NAME = "send-hunt-push";

export type PushNotificationJobData = HuntPushPayload;

const globalForQueue = globalThis as unknown as {
  pushNotificationQueue: Queue<PushNotificationJobData> | undefined;
};

function getPushNotificationQueue(): Queue<PushNotificationJobData> | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!globalForQueue.pushNotificationQueue) {
    globalForQueue.pushNotificationQueue = new Queue<PushNotificationJobData>(
      PUSH_NOTIFICATION_QUEUE_NAME,
      {
        connection: getRedisConnectionOptions(),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      },
    );
  }

  return globalForQueue.pushNotificationQueue;
}

export function pushNotificationJobId(payload: PushNotificationJobData): string {
  return `push-${payload.type}-${payload.huntId}-${Date.now()}`;
}

export async function enqueuePushNotification(
  payload: PushNotificationJobData,
): Promise<boolean> {
  const queue = getPushNotificationQueue();
  if (!queue) {
    return false;
  }

  await queue.add(PUSH_NOTIFICATION_JOB_NAME, payload, {
    jobId: pushNotificationJobId(payload),
  });

  return true;
}
