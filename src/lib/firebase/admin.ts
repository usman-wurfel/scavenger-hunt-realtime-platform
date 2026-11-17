import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

const DEFAULT_SERVICE_ACCOUNT_FILE =
  "hunt-aa5e8-firebase-adminsdk-fbsvc-e3f5cbcdf5.json";

const globalForFirebase = globalThis as unknown as {
  firebaseAdminApp: App | undefined;
};

function resolveServiceAccountPath(): string | null {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (configured) {
    const configuredPath = path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
    if (existsSync(configuredPath)) {
      return configuredPath;
    }
    console.warn(
      `[firebase] FIREBASE_SERVICE_ACCOUNT_PATH missing at ${configuredPath} — trying default`,
    );
  }

  const defaultPath = path.join(process.cwd(), DEFAULT_SERVICE_ACCOUNT_FILE);
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  return null;
}

export function isFirebaseConfigured(): boolean {
  return resolveServiceAccountPath() !== null;
}

export function getFirebaseAdminApp(): App | null {
  if (globalForFirebase.firebaseAdminApp) {
    return globalForFirebase.firebaseAdminApp;
  }

  if (getApps().length > 0) {
    globalForFirebase.firebaseAdminApp = getApp();
    return globalForFirebase.firebaseAdminApp;
  }

  const serviceAccountPath = resolveServiceAccountPath();
  if (!serviceAccountPath) {
    console.warn("[firebase] Service account JSON not found — push disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, "utf8"),
    ) as ServiceAccount;

    globalForFirebase.firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error("[firebase] Failed to initialize Firebase Admin:", error);
    return null;
  }

  return globalForFirebase.firebaseAdminApp;
}

export function getFirebaseMessaging(): Messaging | null {
  const app = getFirebaseAdminApp();
  return app ? getMessaging(app) : null;
}
