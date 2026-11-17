import mqtt, { type MqttClient } from "mqtt";

import { getMqttUrl, isMqttConfigured } from "@/lib/mqtt/config";

let publisher: MqttClient | null = null;
let publisherReady: Promise<MqttClient | null> | null = null;

function createPublisher(): Promise<MqttClient | null> {
  if (!isMqttConfigured()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const client = mqtt.connect(getMqttUrl(), {
      clientId: `scavenger-hunt-api-${process.pid}`,
      reconnectPeriod: 2_000,
      connectTimeout: 10_000,
      clean: true,
    });

    const finish = (value: MqttClient | null) => {
      client.removeAllListeners();
      resolve(value);
    };

    client.once("connect", () => finish(client));
    client.once("error", (error) => {
      console.error("[mqtt] Publisher connection failed:", error);
      client.end(true);
      finish(null);
    });
  });
}

export async function getMqttPublisher(): Promise<MqttClient | null> {
  if (!isMqttConfigured()) {
    return null;
  }

  if (publisher?.connected) {
    return publisher;
  }

  if (!publisherReady) {
    publisherReady = createPublisher().then((client) => {
      publisher = client;
      publisherReady = null;
      return client;
    });
  }

  return publisherReady;
}

export async function publishMqttMessage(
  topic: string,
  payload: Record<string, unknown>,
  options: { retain?: boolean; qos?: 0 | 1 } = {},
): Promise<void> {
  const client = await getMqttPublisher();
  if (!client) return;

  await new Promise<void>((resolve) => {
    client.publish(
      topic,
      JSON.stringify(payload),
      {
        qos: options.qos ?? 1,
        retain: options.retain ?? false,
      },
      () => resolve(),
    );
  });
}

export async function clearRetainedMqttMessage(topic: string): Promise<void> {
  await publishMqttMessage(topic, {}, { retain: true, qos: 1 });
}

export async function closeMqttPublisher(): Promise<void> {
  if (!publisher) return;

  const current = publisher;
  publisher = null;
  publisherReady = null;

  await new Promise<void>((resolve) => {
    current.end(false, {}, () => resolve());
  });
}
