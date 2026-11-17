export type AlertTypeRecord = {
  id: string;
  distanceFt: number;
  message: string;
  messageColor: string;
  createdAt: string;
  updatedAt: string;
};

export type AlertTypeInput = {
  distanceFt: number;
  message: string;
  messageColor: string;
};

export type AlertTypesListQuery = {
  page: number;
  pageSize: number;
  search: string;
};

export type AlertTypesListResult = {
  alertTypes: AlertTypeRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
export const DEFAULT_MESSAGE_COLOR = "#000000";
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeMessageColor(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_MESSAGE_COLOR;
  }

  const color = value.trim();
  return HEX_COLOR_REGEX.test(color) ? color : DEFAULT_MESSAGE_COLOR;
}

export function parseMessageColor(value: unknown): { color?: string; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { color: DEFAULT_MESSAGE_COLOR };
  }

  if (typeof value !== "string") {
    return { error: "Message color must be a valid hex color" };
  }

  const color = value.trim();
  if (!HEX_COLOR_REGEX.test(color)) {
    return { error: "Message color must be a valid hex color (e.g. #000000)" };
  }

  return { color };
}

export function parseAlertTypesListQuery(searchParams: URLSearchParams): AlertTypesListQuery {
  const page = Math.max(0, Number(searchParams.get("page")) || 0);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
  );
  const search = (searchParams.get("search") || "").trim();

  return { page, pageSize, search };
}

export function buildAlertTypesWhere(search: string) {
  if (!search) return undefined;

  const orFilters: Array<{ message: { contains: string; mode: "insensitive" } } | { distanceFt: number }> = [
    { message: { contains: search, mode: "insensitive" } },
  ];

  const distance = Number(search);
  if (Number.isFinite(distance) && distance >= 1) {
    orFilters.push({ distanceFt: distance });
  }

  return { OR: orFilters };
}

export function parseAlertTypeInput(body: unknown): { data?: AlertTypeInput; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const { distanceFt, message, messageColor } = body as Record<string, unknown>;
  const distance = Number(distanceFt);

  if (!Number.isFinite(distance) || distance < 1) {
    return { error: "Distance must be at least 1 ft" };
  }

  if (typeof message !== "string" || !message.trim()) {
    return { error: "Alert message is required" };
  }

  const parsedColor = parseMessageColor(messageColor);
  if (parsedColor.error) {
    return { error: parsedColor.error };
  }

  return {
    data: {
      distanceFt: distance,
      message: message.trim(),
      messageColor: parsedColor.color!,
    },
  };
}

export function serializeAlertType(alertType: {
  id: string;
  distanceFt: number;
  message: string;
  messageColor: string;
  createdAt: Date;
  updatedAt: Date;
}): AlertTypeRecord {
  return {
    id: alertType.id,
    distanceFt: alertType.distanceFt,
    message: alertType.message,
    messageColor: alertType.messageColor || DEFAULT_MESSAGE_COLOR,
    createdAt: alertType.createdAt.toISOString(),
    updatedAt: alertType.updatedAt.toISOString(),
  };
}
