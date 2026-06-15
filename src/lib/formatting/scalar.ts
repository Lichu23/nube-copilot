/**
 * Format various scalar types (string, number, boolean) for display
 */
export function formatScalar(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("es-AR")
      : value.toFixed(1);
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (value == null) {
    return "—";
  }

  return JSON.stringify(value);
}

/**
 * Format number with signed indicator (+/-)
 */
export function formatSignedNumber(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/**
 * Format number as percentage
 * Input is already expressed as percentage points, not a 0-1 ratio.
 */
export function formatPercent(value: number, label?: string): string {
  const formatted = `${value.toFixed(1)}%`;
  return label ? `${formatted} ${label}` : formatted;
}

/**
 * Format number as signed percentage
 */
export function formatSignedPercent(value: number, label?: string): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatPercent(value, label)}`;
}
