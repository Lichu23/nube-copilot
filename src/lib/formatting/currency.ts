/**
 * Format a number as currency with Argentine Spanish locale
 * @param value - Number to format
 * @param currency - Currency code (default: "USD")
 * @param options - Formatting options
 */
export function formatCurrency(
  value: number,
  currency: string | null | undefined,
  options?: {
    maxFractionDigits?: number;
    minFractionDigits?: number;
  }
): string {
  return new Intl.NumberFormat("es-AR", {
    currency: currency ?? "USD",
    maximumFractionDigits: options?.maxFractionDigits ?? 0,
    minimumFractionDigits: options?.minFractionDigits ?? 0,
    style: "currency",
  }).format(value);
}

/**
 * Format a currency value with sign (positive/negative indicator)
 */
export function formatSignedCurrency(
  value: number,
  currency: string | null | undefined
): string {
  const formatted = formatCurrency(value, currency);
  return value >= 0 ? `+${formatted}` : formatted;
}
