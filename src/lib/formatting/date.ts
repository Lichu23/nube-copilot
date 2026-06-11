import { formatDistanceToNowStrict } from "date-fns";

/**
 * Format a date string (YYYY-MM-DD) to Argentine Spanish format
 */
export function formatDateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

/**
 * Format a date string (YYYY-MM-DD) to a compact Argentine Spanish label.
 */
export function formatShortDateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

/**
 * Format an ISO timestamp to Argentine Spanish date/time.
 */
export function formatDateTimeLabel(value: string | null): string {
  if (!value) {
    return "Todavía no sincronizado";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = parsed.getUTCDate();
  const month = parsed.getUTCMonth() + 1;
  const year = String(parsed.getUTCFullYear()).slice(-2);
  const hours = parsed.getUTCHours();
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "p. m." : "a. m.";
  const hour12 = hours % 12 || 12;

  return `${day}/${month}/${year}, ${hour12}:${minutes} ${period}`;
}

/**
 * Format a date range (start and end dates)
 */
export function formatDateRange(
  start?: string | null,
  end?: string | null
): string {
  if (!start && !end) {
    return "Ventana sincronizada actual";
  }

  if (start && end) {
    return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
  }

  return start ? formatDateLabel(start) : formatDateLabel(end ?? "");
}

/**
 * Format last sync timestamp (distance from now)
 */
export function formatLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) {
    return "Todavía no sincronizado";
  }

  const date = new Date(lastSyncAt);

  if (Number.isNaN(date.getTime())) {
    return "Sincronizado recién";
  }

  return `Sincronizado ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}
