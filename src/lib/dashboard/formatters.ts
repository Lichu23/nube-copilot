import { formatSignedCurrency } from "@/lib/formatting";

export function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSignedPercent(value: number | null, label: string) {
  if (value == null) {
    return `vs periodo anterior (${label}) no disponible`;
  }

  const rounded = Math.abs(value).toFixed(1);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${rounded}% vs periodo anterior (${label})`;
}

export function formatRevenueComparisonHelper(input: {
  absoluteChange: number;
  currency: string | null;
  label: string;
  percentageChange: number | null;
}) {
  return `${formatSignedPercent(input.percentageChange, input.label)} - Δ ${formatSignedCurrency(
    input.absoluteChange,
    input.currency,
  )}`;
}
