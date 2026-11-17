import { DEFAULT_MESSAGE_COLOR } from "@/lib/alert-types";
import { toAbsoluteUrl, buildHuntQrScanUrl } from "@/lib/app-url";
import {
  DEFAULT_APP_TIMEZONE,
  getAppTimezone,
  getScheduledHuntStartAt,
  getScheduledHuntStartDelayMs,
} from "@/lib/timezone";

export { getScheduledHuntStartAt, getScheduledHuntStartDelayMs } from "@/lib/timezone";

export type EventStatusValue = "scheduled" | "started" | "ended";
export type DbEventStatus = "SCHEDULED" | "STARTED" | "ENDED";

export const ACTIVE_EVENT_BLOCK_MESSAGE =
  "An event is already scheduled or in progress. Please end it before creating a new one.";

export const NO_ACTIVE_HUNT_MESSAGE =
  "There is no currently active hunt. Check after some time for available hunts.";

export const EVENT_NOT_FOUND_MESSAGE = "Event not found.";
export const EVENT_START_INVALID_MESSAGE = "Only a scheduled event can be started.";
export const EVENT_ALREADY_STARTED_MESSAGE = "Event is already started.";
export const EVENT_ALREADY_ENDED_MESSAGE = "Event has already ended.";
export const EVENT_END_INVALID_MESSAGE = "Only a scheduled or started event can be ended.";
export const EVENT_UPDATE_ENDED_MESSAGE = "Ended events cannot be updated.";
export const EVENT_UPDATE_STARTED_FIELDS_MESSAGE =
  "Only playerClue and playerNearbyRadiusFt can be updated for a started event.";

export const HUNT_DATETIME_UNAVAILABLE_MESSAGE =
  "A hunt is already scheduled or in progress at this date and time.";
export const HUNT_DATETIME_AVAILABLE_MESSAGE = "This hunt date and time is available.";
export const HUNT_CODE_AVAILABLE_MESSAGE = "This hunt code is available.";
export const HUNT_CODE_UNAVAILABLE_MESSAGE = "This hunt code is already in use. Please choose another code.";
export const HUNT_CODE_REQUIRED_MESSAGE = "huntCode is required";
export const HUNT_CODE_INVALID_MESSAGE =
  "huntCode must be 4-15 characters using only uppercase letters (A-Z) and digits (0-9)";

export const eventWithAlertsInclude = {
  proximityAlerts: true,
  area: true,
} as const;

export const eventDetailInclude = {
  proximityAlerts: true,
  participants: {
    orderBy: [{ scanRank: { sort: "asc" as const, nulls: "last" as const } }, { createdAt: "asc" as const }],
  },
};

export const eventListCountInclude = {
  area: true,
  _count: {
    select: { proximityAlerts: true, participants: true },
  },
} as const;

export const eventHistoryListInclude = {
  area: true,
  _count: {
    select: { participants: true },
  },
} as const;

export const participantOrderBy = [
  { scanRank: { sort: "asc" as const, nulls: "last" as const } },
  { createdAt: "asc" as const },
] as const;

export function isScheduledHuntStartPassed(
  eventDate: Date,
  eventTime: string,
  timezone: string = DEFAULT_APP_TIMEZONE,
  now = new Date(),
): boolean {
  const startAt = getScheduledHuntStartAt(eventDate, eventTime, timezone);
  if (!startAt) return false;

  return startAt.getTime() < now.getTime();
}

export function hasScheduledDateTimeChanged(
  existing: { eventDate: Date; eventTime: string; timezone: string },
  updated: { huntDate: string; huntTime: string },
): boolean {
  const existingDate = existing.eventDate.toISOString().slice(0, 10);
  const appTimezone = getAppTimezone();

  return (
    existingDate !== updated.huntDate ||
    existing.eventTime !== updated.huntTime ||
    existing.timezone !== appTimezone
  );
}

export function isPlayerVisibleActiveHunt(event: {
  status: DbEventStatus | EventStatusValue;
  eventDate: Date;
  eventTime: string;
  timezone?: string;
}): boolean {
  if (event.status === "STARTED" || event.status === "started") return true;
  if (event.status === "SCHEDULED" || event.status === "scheduled") {
    return !isScheduledHuntStartPassed(event.eventDate, event.eventTime, getAppTimezone());
  }
  return false;
}

export function serializeEventStatus(status: DbEventStatus | EventStatusValue): EventStatusValue {
  if (status === "STARTED" || status === "started") return "started";
  if (status === "ENDED" || status === "ended") return "ended";
  return "scheduled";
}

export function formatEventTime12h(time24: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24.trim());
  if (!match) return time24;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minutes} ${period}`;
}

export type ProximityAlertInput = {
  alertTypeId: string;
  distanceFt: number;
  message: string;
  messageColor: string;
};

export type ProximityAlertRecord = {
  id: string;
  alertTypeId: string;
  distanceFt: number;
  message: string;
  messageColor: string;
};

export type HuntAreaSummary = {
  id: string;
  name: string;
  slug: string;
};

function serializeHuntAreaSummary(area: HuntAreaSummary | null): HuntAreaSummary | null {
  return area ? { id: area.id, name: area.name, slug: area.slug } : null;
}

export type EventParticipantRecord = {
  id: string;
  username: string;
  deviceId: string;
  joinedAt: string;
  scanRank: number | null;
  scannedAt: string | null;
  prizeClaimStatus: "none" | "waiting" | "claimed";
  winnerMessage: string | null;
  winnerMessageSentAt: string | null;
  prizeClaimedAt: string | null;
};

export type EventRecord = {
  id: string;
  area: HuntAreaSummary | null;
  huntName: string;
  location: string;
  latitude: number;
  longitude: number;
  huntDate: string;
  huntTime: string;
  timezone: string;
  huntCode: string;
  playerClue: string;
  playerNearbyRadiusFt: number;
  status: EventStatusValue;
  qrCodeUrl: string | null;
  qrScanUrl: string;
  proximityAlerts: ProximityAlertRecord[];
  participants: EventParticipantRecord[];
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type UserActiveHuntRecord = {
  id: string;
  area: HuntAreaSummary | null;
  huntName: string;
  location: string;
  latitude: number;
  longitude: number;
  huntDate: string;
  huntTime: string;
  timezone: string;
  huntCode: string;
  playerClue: string;
  playerNearbyRadiusFt: number;
  status: EventStatusValue;
  proximityAlerts: Array<{
    id: string;
    distanceFt: number;
    message: string;
    messageColor: string;
  }>;
};

export type CreateEventInput = {
  areaId?: string;
  huntName: string;
  location: string;
  latitude: number;
  longitude: number;
  huntDate: string;
  huntTime: string;
  timezone: string;
  huntCode: string;
  playerClue: string;
  playerNearbyRadiusFt?: number;
  proximityAlertIds: string[];
  status: "scheduled" | "started";
};

export type ScheduledEventInput = Omit<CreateEventInput, "status">;

export type UpdateStartedEventInput = {
  playerClue?: string;
  playerNearbyRadiusFt?: number;
};

export type EventListQuery = {
  page: number;
  pageSize: number;
  search: string;
};

export type EventListRecord = {
  id: string;
  area: HuntAreaSummary | null;
  huntName: string;
  location: string;
  huntDate: string;
  huntTime: string;
  timezone: string;
  huntCode: string;
  status: EventStatusValue;
  playerNearbyRadiusFt: number;
  alertCount: number;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EventHistoryRecord = {
  id: string;
  area: HuntAreaSummary | null;
  huntName: string;
  location: string;
  huntDate: string;
  huntTime: string;
  timezone: string;
  huntCode: string;
  status: EventStatusValue;
  participantCount: number;
  endedAt: string | null;
};

export type EventHistoryQuery = {
  page: number;
  pageSize: number;
  search: string;
  type: EventStatusValue | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type EventDetailRecord = EventRecord & {
  participantsPagination: PaginationMeta;
};

const DEFAULT_LIST_PAGE_SIZE = 10;
const MAX_LIST_PAGE_SIZE = 100;

export function parseEventListQuery(searchParams: URLSearchParams): EventListQuery {
  const page = Math.max(0, Number(searchParams.get("page")) || 0);
  const pageSize = Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_LIST_PAGE_SIZE),
  );
  const search = (searchParams.get("search") || "").trim();

  return { page, pageSize, search };
}

export function toDbEventStatus(status: EventStatusValue): DbEventStatus {
  if (status === "started") return "STARTED";
  if (status === "ended") return "ENDED";
  return "SCHEDULED";
}

export function parseEventHistoryQuery(
  searchParams: URLSearchParams,
): { data: EventHistoryQuery } | { error: string } {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage - 1 : 0;
  const pageSize = Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_LIST_PAGE_SIZE),
  );
  const search = (searchParams.get("search") || "").trim();
  const rawType = (searchParams.get("type") || "").trim().toLowerCase();

  if (!rawType) {
    return { data: { page, pageSize, search, type: null } };
  }

  if (rawType === "scheduled" || rawType === "started" || rawType === "ended") {
    return { data: { page, pageSize, search, type: rawType } };
  }

  return { error: "type must be scheduled, started, or ended" };
}

export function parseParticipantListQuery(searchParams: URLSearchParams): EventListQuery {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage - 1 : 0;
  const pageSize = Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_LIST_PAGE_SIZE),
  );
  const search = (searchParams.get("search") || "").trim();

  return { page, pageSize, search };
}

export function eventHistoryStatusRank(status: DbEventStatus): number {
  if (status === "STARTED") return 0;
  if (status === "SCHEDULED") return 1;
  return 2;
}

export function compareEventHistoryOrder(
  a: { status: DbEventStatus; eventDate: Date; eventTime: string },
  b: { status: DbEventStatus; eventDate: Date; eventTime: string },
): number {
  const statusDiff = eventHistoryStatusRank(a.status) - eventHistoryStatusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  const dateDiff = b.eventDate.getTime() - a.eventDate.getTime();
  if (dateDiff !== 0) return dateDiff;

  return b.eventTime.localeCompare(a.eventTime);
}

export function compareDashboardHuntOrder(
  a: { status: DbEventStatus; eventDate: Date; eventTime: string },
  b: { status: DbEventStatus; eventDate: Date; eventTime: string },
): number {
  const statusDiff = eventHistoryStatusRank(a.status) - eventHistoryStatusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  const dateDiff = a.eventDate.getTime() - b.eventDate.getTime();
  if (dateDiff !== 0) return dateDiff;

  return a.eventTime.localeCompare(b.eventTime);
}

export function buildEventsWhere(search: string) {
  if (!search) return undefined;

  return {
    OR: [
      { eventName: { contains: search, mode: "insensitive" as const } },
      { location: { contains: search, mode: "insensitive" as const } },
      { eventCode: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

export function buildEventHistoryWhere(search: string, type: EventStatusValue | null) {
  const filters = [];

  if (type) {
    filters.push({ status: toDbEventStatus(type) });
  }

  const searchWhere = buildEventsWhere(search);
  if (searchWhere) {
    filters.push(searchWhere);
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return { AND: filters };
}

export function buildParticipantsWhere(eventId: string, search: string) {
  const base = { eventId };

  if (!search) return base;

  const orFilters: Array<
    | { username: { contains: string; mode: "insensitive" } }
    | { deviceId: { contains: string; mode: "insensitive" } }
    | { scanRank: number }
  > = [
    { username: { contains: search, mode: "insensitive" } },
    { deviceId: { contains: search, mode: "insensitive" } },
  ];

  const rank = Number(search);
  if (Number.isFinite(rank) && rank >= 1) {
    orFilters.push({ scanRank: rank });
  }

  return {
    ...base,
    OR: orFilters,
  };
}

export function serializeEventParticipant(participant: {
  id: string;
  username: string;
  deviceId: string;
  createdAt: Date;
  scanRank: number | null;
  scannedAt: Date | null;
  prizeClaimStatus?: string | null;
  winnerMessage?: string | null;
  winnerMessageSentAt?: Date | null;
  prizeClaimedAt?: Date | null;
}): EventParticipantRecord {
  const status = String(participant.prizeClaimStatus ?? "NONE");
  const prizeClaimStatus =
    status === "WAITING" ? "waiting" : status === "CLAIMED" ? "claimed" : "none";

  return {
    id: participant.id,
    username: participant.username,
    deviceId: participant.deviceId,
    joinedAt: participant.createdAt.toISOString(),
    scanRank: participant.scanRank,
    scannedAt: participant.scannedAt?.toISOString() ?? null,
    prizeClaimStatus,
    winnerMessage: participant.winnerMessage ?? null,
    winnerMessageSentAt: participant.winnerMessageSentAt?.toISOString() ?? null,
    prizeClaimedAt: participant.prizeClaimedAt?.toISOString() ?? null,
  };
}

export function serializeEventListItem(event: {
  id: string;
  area: HuntAreaSummary | null;
  eventName: string;
  location: string;
  eventDate: Date;
  eventTime: string;
  timezone: string;
  eventCode: string;
  status: DbEventStatus;
  playerNearbyRadius: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { proximityAlerts: number; participants: number };
}): EventListRecord {
  return {
    id: event.id,
    area: serializeHuntAreaSummary(event.area),
    huntName: event.eventName,
    location: event.location,
    huntDate: event.eventDate.toISOString().slice(0, 10),
    huntTime: event.eventTime,
    timezone: event.timezone,
    huntCode: event.eventCode,
    status: serializeEventStatus(event.status),
    playerNearbyRadiusFt: event.playerNearbyRadius,
    alertCount: event._count.proximityAlerts,
    participantCount: event._count.participants,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function serializeEventHistoryItem(event: {
  id: string;
  area: HuntAreaSummary | null;
  eventName: string;
  location: string;
  eventDate: Date;
  eventTime: string;
  timezone: string;
  eventCode: string;
  status: DbEventStatus;
  endedAt?: Date | null;
  _count: { participants: number };
}): EventHistoryRecord {
  return {
    id: event.id,
    area: serializeHuntAreaSummary(event.area),
    huntName: event.eventName,
    location: event.location,
    huntDate: event.eventDate.toISOString().slice(0, 10),
    huntTime: event.eventTime,
    timezone: event.timezone,
    huntCode: event.eventCode,
    status: serializeEventStatus(event.status),
    participantCount: event._count.participants,
    endedAt: event.endedAt?.toISOString() ?? null,
  };
}

const EVENT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EVENT_CODE_LENGTH = 8;
const EVENT_CODE_REGEX = /^[A-Z0-9]{4,15}$/;
const EVENT_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EVENT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_DATETIME_REGEX = /^(\d{4}-\d{2}-\d{2})[T ]([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function generateEventCode(length = EVENT_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += EVENT_CODE_CHARS[Math.floor(Math.random() * EVENT_CODE_CHARS.length)];
  }
  return code;
}

function parseEventDate(value: unknown): { date?: Date; isoDate?: string; error?: string } {
  if (typeof value !== "string" || !EVENT_DATE_REGEX.test(value.trim())) {
    return { error: "Event date must be in YYYY-MM-DD format" };
  }

  const isoDate = value.trim();
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Event date is invalid" };
  }

  return { date, isoDate };
}

function parseEventTime(value: unknown): { time?: string; error?: string } {
  if (typeof value !== "string" || !EVENT_TIME_REGEX.test(value.trim())) {
    return { error: "Event time must be in HH:mm format (24-hour)" };
  }

  return { time: value.trim() };
}

export function parseEventDatetime(
  value: unknown,
): { huntDate?: string; huntTime?: string; error?: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "eventDatetime is required" };
  }

  const match = EVENT_DATETIME_REGEX.exec(value.trim());
  if (!match) {
    return { error: "eventDatetime must be in YYYY-MM-DDTHH:mm format" };
  }

  const huntDate = match[1];
  const huntTime = `${match[2]}:${match[3]}`;
  const parsedDate = parseEventDate(huntDate);
  if (parsedDate.error || !parsedDate.isoDate) {
    return { error: parsedDate.error || "eventDatetime date is invalid" };
  }

  return { huntDate: parsedDate.isoDate, huntTime };
}

function parseEventCode(value: unknown): { code?: string; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { code: generateEventCode() };
  }

  if (typeof value !== "string") {
    return { error: "Event code must be a string" };
  }

  const code = value.trim().toUpperCase();
  if (!EVENT_CODE_REGEX.test(code)) {
    return { error: "Event code must be 4-15 uppercase letters or numbers" };
  }

  return { code };
}

/** Validate a required hunt code (does not auto-generate). */
export function parseHuntCodeForValidation(
  value: unknown,
): { code?: string; error?: string } {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    return { error: HUNT_CODE_REQUIRED_MESSAGE };
  }

  if (typeof value !== "string") {
    return { error: HUNT_CODE_INVALID_MESSAGE };
  }

  const code = value.trim().toUpperCase();
  if (!EVENT_CODE_REGEX.test(code)) {
    return { error: HUNT_CODE_INVALID_MESSAGE };
  }

  return { code };
}

function parseUpdateEventCode(
  value: unknown,
  currentCode: string,
): { code?: string; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { code: currentCode };
  }

  if (typeof value !== "string") {
    return { error: "Event code must be a string" };
  }

  const code = value.trim().toUpperCase();
  if (!EVENT_CODE_REGEX.test(code)) {
    return { error: "Event code must be 4-15 uppercase letters or numbers" };
  }

  return { code };
}

function parsePlayerNearbyRadiusFt(
  value: unknown,
): { radius?: number; useDefault?: boolean; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { useDefault: true };
  }

  const radius = Number(value);
  if (!Number.isFinite(radius) || radius < 1) {
    return { error: "Player nearby radius (ft) must be at least 1" };
  }

  return { radius };
}

export function parseProximityAlertIds(value: unknown): { data?: string[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "At least one proximity alert must be selected" };
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const id = value[index];
    if (typeof id !== "string" || !id.trim()) {
      return { error: `Proximity alert #${index + 1}: id is invalid` };
    }

    const trimmed = id.trim();
    if (seen.has(trimmed)) {
      return { error: "Duplicate proximity alert IDs are not allowed" };
    }

    seen.add(trimmed);
    ids.push(trimmed);
  }

  return { data: ids };
}

export function parseCreateEventStatus(
  value: unknown,
): { status?: "scheduled" | "started"; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { status: "scheduled" };
  }

  if (typeof value !== "string") {
    return { error: "Status must be scheduled or started" };
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "scheduled" || normalized === "started") {
    return { status: normalized };
  }

  return { error: "Status must be scheduled or started" };
}

function readBodyHuntField(
  body: Record<string, unknown>,
  huntKey: string,
  legacyKey: string,
): unknown {
  return body[huntKey] ?? body[legacyKey];
}

export function parseCreateEventInput(body: unknown): { data?: CreateEventInput; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const huntName = readBodyHuntField(record, "huntName", "eventName");
  const huntDate = readBodyHuntField(record, "huntDate", "eventDate");
  const huntTime = readBodyHuntField(record, "huntTime", "eventTime");
  const huntCode = readBodyHuntField(record, "huntCode", "eventCode");
  const {
    areaId,
    location,
    latitude,
    longitude,
    playerClue,
    playerNearbyRadiusFt,
    proximityAlertIds,
    status,
  } = record;

  if (typeof huntName !== "string" || !huntName.trim()) {
    return { error: "Hunt name is required" };
  }

  if (typeof location !== "string" || !location.trim()) {
    return { error: "Location is required" };
  }

  const lat = Number(latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90" };
  }

  const lng = Number(longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180" };
  }

  const parsedDate = parseEventDate(huntDate);
  if (parsedDate.error || !parsedDate.date || !parsedDate.isoDate) {
    return { error: parsedDate.error || "Hunt date is invalid" };
  }

  const parsedTime = parseEventTime(huntTime);
  if (parsedTime.error || !parsedTime.time) {
    return { error: parsedTime.error || "Hunt time is invalid" };
  }

  const parsedCode = parseEventCode(huntCode);
  if (parsedCode.error || !parsedCode.code) {
    return { error: parsedCode.error || "Hunt code is invalid" };
  }

  if (typeof playerClue !== "string" || !playerClue.trim()) {
    return { error: "Player clue is required" };
  }

  const parsedAlertIds = parseProximityAlertIds(proximityAlertIds);
  if (parsedAlertIds.error || !parsedAlertIds.data) {
    return { error: parsedAlertIds.error };
  }

  const parsedRadius = parsePlayerNearbyRadiusFt(playerNearbyRadiusFt);
  if (parsedRadius.error) {
    return { error: parsedRadius.error };
  }

  const parsedStatus = parseCreateEventStatus(status);
  if (parsedStatus.error || !parsedStatus.status) {
    return { error: parsedStatus.error || "Status must be scheduled or started" };
  }

  return {
    data: {
      ...(typeof areaId === "string" && areaId.trim() ? { areaId: areaId.trim() } : {}),
      huntName: huntName.trim(),
      location: location.trim(),
      latitude: lat,
      longitude: lng,
      huntDate: parsedDate.isoDate,
      huntTime: parsedTime.time,
      huntCode: parsedCode.code,
      playerClue: playerClue.trim(),
      ...(parsedRadius.radius !== undefined ? { playerNearbyRadiusFt: parsedRadius.radius } : {}),
      proximityAlertIds: parsedAlertIds.data,
      status: parsedStatus.status,
      timezone: getAppTimezone(),
    },
  };
}

export function parseUpdateScheduledEventInput(
  body: unknown,
  currentEventCode: string,
): { data?: ScheduledEventInput; status?: "scheduled" | "started"; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const huntName = readBodyHuntField(record, "huntName", "eventName");
  const huntDate = readBodyHuntField(record, "huntDate", "eventDate");
  const huntTime = readBodyHuntField(record, "huntTime", "eventTime");
  const huntCode = readBodyHuntField(record, "huntCode", "eventCode");
  const {
    areaId,
    location,
    latitude,
    longitude,
    playerClue,
    playerNearbyRadiusFt,
    proximityAlertIds,
    status,
  } = record;

  if (typeof huntName !== "string" || !huntName.trim()) {
    return { error: "Hunt name is required" };
  }

  if (typeof location !== "string" || !location.trim()) {
    return { error: "Location is required" };
  }

  const lat = Number(latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90" };
  }

  const lng = Number(longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180" };
  }

  const parsedDate = parseEventDate(huntDate);
  if (parsedDate.error || !parsedDate.date || !parsedDate.isoDate) {
    return { error: parsedDate.error || "Hunt date is invalid" };
  }

  const parsedTime = parseEventTime(huntTime);
  if (parsedTime.error || !parsedTime.time) {
    return { error: parsedTime.error || "Hunt time is invalid" };
  }

  const parsedCode = parseUpdateEventCode(huntCode, currentEventCode);
  if (parsedCode.error || !parsedCode.code) {
    return { error: parsedCode.error || "Hunt code is invalid" };
  }

  if (typeof playerClue !== "string" || !playerClue.trim()) {
    return { error: "Player clue is required" };
  }

  const parsedAlertIds = parseProximityAlertIds(proximityAlertIds);
  if (parsedAlertIds.error || !parsedAlertIds.data) {
    return { error: parsedAlertIds.error };
  }

  const parsedRadius = parsePlayerNearbyRadiusFt(playerNearbyRadiusFt);
  if (parsedRadius.error) {
    return { error: parsedRadius.error };
  }

  const parsedStatus = parseCreateEventStatus(status);
  if (parsedStatus.error || !parsedStatus.status) {
    return { error: parsedStatus.error || "Status must be scheduled or started" };
  }

  return {
    status: parsedStatus.status,
    data: {
      ...(typeof areaId === "string" && areaId.trim() ? { areaId: areaId.trim() } : {}),
      huntName: huntName.trim(),
      location: location.trim(),
      latitude: lat,
      longitude: lng,
      huntDate: parsedDate.isoDate,
      huntTime: parsedTime.time,
      huntCode: parsedCode.code,
      playerClue: playerClue.trim(),
      ...(parsedRadius.radius !== undefined ? { playerNearbyRadiusFt: parsedRadius.radius } : {}),
      proximityAlertIds: parsedAlertIds.data,
      timezone: getAppTimezone(),
    },
  };
}

export function parseUpdateStartedEventInput(
  body: unknown,
): { data?: UpdateStartedEventInput; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["playerClue", "playerNearbyRadiusFt"]);
  const extraKeys = Object.keys(record).filter(
    (key) => record[key] !== undefined && !allowedKeys.has(key),
  );

  if (extraKeys.length > 0) {
    return { error: EVENT_UPDATE_STARTED_FIELDS_MESSAGE };
  }

  const data: UpdateStartedEventInput = {};

  if (record.playerClue !== undefined) {
    if (typeof record.playerClue !== "string" || !record.playerClue.trim()) {
      return { error: "Player clue is required" };
    }

    data.playerClue = record.playerClue.trim();
  }

  if (record.playerNearbyRadiusFt !== undefined) {
    const parsedRadius = parsePlayerNearbyRadiusFt(record.playerNearbyRadiusFt);
    if (parsedRadius.error || parsedRadius.radius === undefined) {
      return { error: parsedRadius.error || "Player nearby radius (ft) must be at least 1" };
    }

    data.playerNearbyRadiusFt = parsedRadius.radius;
  }

  if (data.playerClue === undefined && data.playerNearbyRadiusFt === undefined) {
    return { error: "At least one of playerClue or playerNearbyRadiusFt is required" };
  }

  return { data };
}

export function alertTypesToProximityInputs(
  alertTypes: Array<{
    id: string;
    distanceFt: number;
    message: string;
    messageColor: string;
  }>,
): ProximityAlertInput[] {
  return alertTypes.map((alertType) => ({
    alertTypeId: alertType.id,
    distanceFt: alertType.distanceFt,
    message: alertType.message,
    messageColor: alertType.messageColor || DEFAULT_MESSAGE_COLOR,
  }));
}

export function serializeUserActiveHunt(event: {
  id: string;
  area: HuntAreaSummary | null;
  eventName: string;
  location: string;
  latitude: number;
  longitude: number;
  eventDate: Date;
  eventTime: string;
  timezone: string;
  eventCode: string;
  playerClue: string;
  playerNearbyRadius: number;
  status: DbEventStatus;
  proximityAlerts: Array<{
    id: string;
    distanceFt: number;
    message: string;
    messageColor: string;
    sortOrder: number;
  }>;
}): UserActiveHuntRecord {
  return {
    id: event.id,
    area: serializeHuntAreaSummary(event.area),
    huntName: event.eventName,
    location: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    huntDate: event.eventDate.toISOString().slice(0, 10),
    huntTime: event.eventTime,
    timezone: event.timezone,
    huntCode: event.eventCode,
    playerClue: event.playerClue,
    playerNearbyRadiusFt: event.playerNearbyRadius,
    status: serializeEventStatus(event.status),
    proximityAlerts: [...event.proximityAlerts]
      .sort((a, b) => b.sortOrder - a.sortOrder || b.distanceFt - a.distanceFt)
      .map((alert) => ({
        id: alert.id,
        distanceFt: alert.distanceFt,
        message: alert.message,
        messageColor: alert.messageColor || DEFAULT_MESSAGE_COLOR,
      })),
  };
}

export function serializeEvent(event: {
  id: string;
  area: HuntAreaSummary | null;
  eventName: string;
  location: string;
  latitude: number;
  longitude: number;
  eventDate: Date;
  eventTime: string;
  timezone: string;
  eventCode: string;
  playerClue: string;
  playerNearbyRadius: number;
  status: DbEventStatus;
  qrCodeUrl: string | null;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  proximityAlerts: Array<{
    id: string;
    alertTypeId: string;
    distanceFt: number;
    message: string;
    messageColor: string;
    sortOrder: number;
  }>;
  participants?: Array<{
    id: string;
    username: string;
    deviceId: string;
    createdAt: Date;
    scanRank: number | null;
    scannedAt: Date | null;
  }>;
}): EventRecord {
  const participants = (event.participants ?? []).map(serializeEventParticipant);

  return {
    id: event.id,
    area: serializeHuntAreaSummary(event.area),
    huntName: event.eventName,
    location: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    huntDate: event.eventDate.toISOString().slice(0, 10),
    huntTime: event.eventTime,
    timezone: event.timezone,
    huntCode: event.eventCode,
    playerClue: event.playerClue,
    playerNearbyRadiusFt: event.playerNearbyRadius,
    status: serializeEventStatus(event.status),
    qrCodeUrl: toAbsoluteUrl(event.qrCodeUrl),
    qrScanUrl: buildHuntQrScanUrl(event.eventCode),
    proximityAlerts: [...event.proximityAlerts]
      .sort((a, b) => b.sortOrder - a.sortOrder || b.distanceFt - a.distanceFt)
      .map((alert) => ({
        id: alert.id,
        alertTypeId: alert.alertTypeId,
        distanceFt: alert.distanceFt,
        message: alert.message,
        messageColor: alert.messageColor || DEFAULT_MESSAGE_COLOR,
      })),
    participants,
    participantCount: participants.length,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() ?? null,
  };
}

export function serializeEventDetail(
  event: Parameters<typeof serializeEvent>[0],
  participants: NonNullable<Parameters<typeof serializeEvent>[0]["participants"]>,
  participantsPagination: PaginationMeta,
  participantCount: number,
): EventDetailRecord {
  const serialized = serializeEvent({ ...event, participants });

  return {
    ...serialized,
    participantCount,
    participantsPagination,
  };
}
