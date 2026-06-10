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
