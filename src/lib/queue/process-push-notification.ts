import { sendHuntPushNotification } from "@/lib/push-notifications/send";

import type { PushNotificationJobData } from "./push-notification-queue";

export async function processPushNotificationJob(
  data: PushNotificationJobData,
): Promise<void> {
  await sendHuntPushNotification(data);
}
