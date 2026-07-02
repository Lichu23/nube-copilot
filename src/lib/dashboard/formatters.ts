import { formatSignedCurrency } from "@/lib/formatting";

const percentageFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const HUGE_PERCENTAGE_THRESHOLD = 999;

export function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSignedPercent(value: number | null, label: string) {
  if (value == null) {
    return `vs per\u00edodo anterior (${label}) no disponible`;
  }

  if (Math.abs(value) > HUGE_PERCENTAGE_THRESHOLD) {
    return value > 0
      ? `M\u00e1s de ${percentageFormatter.format(HUGE_PERCENTAGE_THRESHOLD)}% vs per\u00edodo anterior (${label})`
      : `Ca\u00edda mayor a ${percentageFormatter.format(HUGE_PERCENTAGE_THRESHOLD)}% vs per\u00edodo anterior (${label})`;
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${percentageFormatter.format(Math.abs(value))}% vs per\u00edodo anterior (${label})`;
}

export function formatRevenueComparisonHelper(input: {
  absoluteChange: number;
  currency: string | null;
  label: string;
  percentageChange: number | null;
}) {
  return `${formatSignedPercent(input.percentageChange, input.label)} \u00b7 \u0394 ${formatSignedCurrency(
    input.absoluteChange,
    input.currency,
  )}`;
}
