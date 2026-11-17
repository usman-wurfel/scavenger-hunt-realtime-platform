import dayjs from "dayjs";
import timezonePlugin from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const FALLBACK_TIMEZONE = "America/Chicago";

/** Shown first in the Settings dropdown for quick pick. */
const PREFERRED_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Mexico_City",
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
] as const;

function formatTimezoneLabel(timezone: string): string {
  if (timezone === "UTC") return "UTC";
  return timezone.replace(/_/g, " ");
}

function listSystemTimezones(): string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return [...Intl.supportedValuesOf("timeZone")];
    }
  } catch {
    // Fall through to preferred list.
  }
  return [...PREFERRED_TIMEZONES];
}

export const APP_TIMEZONE_OPTIONS: { value: string; label: string }[] = (() => {
  const all = listSystemTimezones();
  const allSet = new Set(all);
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];

  for (const timezone of PREFERRED_TIMEZONES) {
    if (!allSet.has(timezone) && timezone !== "UTC") continue;
    if (seen.has(timezone)) continue;
    seen.add(timezone);
    options.push({ value: timezone, label: formatTimezoneLabel(timezone) });
  }

  for (const timezone of all.sort((a, b) => a.localeCompare(b))) {
    if (seen.has(timezone)) continue;
    seen.add(timezone);
    options.push({ value: timezone, label: formatTimezoneLabel(timezone) });
  }

  if (!seen.has("UTC")) {
    options.unshift({ value: "UTC", label: "UTC" });
  }

  return options;
})();

let cachedTimezone: string | null = null;

export function isValidTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function normalizeTimezone(value: string | null | undefined): string {
  const configured = value?.trim() || process.env.APP_TIMEZONE?.trim() || FALLBACK_TIMEZONE;
  return isValidTimezone(configured) ? configured : FALLBACK_TIMEZONE;
}

export function setAppTimezoneCache(timezone: string): void {
  cachedTimezone = normalizeTimezone(timezone);
}

export function getAppTimezone(): string {
  if (cachedTimezone) return cachedTimezone;
  return normalizeTimezone(null);
}

export const DEFAULT_APP_TIMEZONE = getAppTimezone();

export function toEventDateIso(date: Date | string): string {
  return typeof date === "string" ? date : date.toISOString().slice(0, 10);
}

export function getScheduledHuntStartAt(
  eventDate: Date | string,
  eventTime: string,
  timezone: string = getAppTimezone(),
): Date | null {
  const isoDate = toEventDateIso(eventDate);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(eventTime.trim());
  if (!match) return null;

  const localStart = dayjs.tz(
    `${isoDate} ${match[1]}:${match[2]}`,
    "YYYY-MM-DD HH:mm",
    timezone,
  );

  if (!localStart.isValid()) return null;

  return localStart.toDate();
}

export function getScheduledHuntStartDelayMs(
  eventDate: Date | string,
  eventTime: string,
  timezone: string = getAppTimezone(),
  now = new Date(),
): number | null {
  const startAt = getScheduledHuntStartAt(eventDate, eventTime, timezone);
  if (!startAt) return null;

  return Math.max(0, startAt.getTime() - now.getTime());
}

export function getTodayDateIsoInAppTimezone(now = new Date()): string {
  return dayjs(now).tz(getAppTimezone()).format("YYYY-MM-DD");
}
