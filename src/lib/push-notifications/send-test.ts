import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";

export type TestPushInput = {
  fcmToken: string;
  title?: string;
  body?: string;
  type?: string;
};

export async function sendTestPushToToken(input: TestPushInput): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: "Firebase is not configured" };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return { success: false, error: "Firebase messaging is unavailable" };
  }

  const fcmToken = input.fcmToken.trim();
  if (!fcmToken) {
    return { success: false, error: "fcmToken is required" };
  }

  const title = input.title?.trim() || "Scavenger Hunt Test";
  const body = input.body?.trim() || "This is a test push notification from the backend.";
  const type = input.type?.trim() || "test";

  try {
    const messageId = await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: {
        type,
        source: "push_test",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "hunt_events",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    return { success: true, messageId };
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    return {
      success: false,
      error: firebaseError.message || "Failed to send test push",
      code: firebaseError.code,
    };
  }
}
