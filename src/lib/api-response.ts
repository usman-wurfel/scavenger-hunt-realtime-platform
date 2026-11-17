import { NextResponse } from "next/server";

export type ApiErrorBody = {
  success: false;
  error: string;
  debug?: string;
};

export type ApiMessageBody = {
  success: false;
  message: string;
};

export type ApiSuccessBody<T extends Record<string, unknown> = Record<string, never>> = {
  success: true;
} & T;

export function isApiDebugEnabled(): boolean {
  return process.env.APP_DEBUG === "true" || process.env.NODE_ENV === "development";
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function withNoStoreHeaders(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }
  return { ...init, headers };
}

export function apiOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { success: true, ...data } satisfies ApiSuccessBody<T>,
    withNoStoreHeaders(init),
  );
}

export function apiFail(error: string, status = 400, init?: ResponseInit) {
  return NextResponse.json(
    { success: false, error } satisfies ApiErrorBody,
    withNoStoreHeaders({ ...init, status }),
  );
}

export function apiFailFromError(fallback: string, error: unknown, status = 500, init?: ResponseInit) {
  console.error(`[api] ${fallback}`, error);

  const body: ApiErrorBody = { success: false, error: fallback };
  if (isApiDebugEnabled()) {
    body.debug = formatUnknownError(error);
    body.error = error instanceof Error ? `${fallback}: ${error.message}` : fallback;
  }

  return NextResponse.json(body, withNoStoreHeaders({ ...init, status }));
}

export function apiMessage(
  message: string,
  extra?: Record<string, unknown>,
  init?: ResponseInit,
) {
  return NextResponse.json(
    { success: false, message, ...extra } satisfies ApiMessageBody & Record<string, unknown>,
    withNoStoreHeaders(init),
  );
}
