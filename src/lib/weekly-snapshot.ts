import type { ComparePeriodsResult, SalesSummary, TopProductRow } from "@/lib/db/queries/metrics";

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("en", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "unavailable";
  }

  const rounded = Math.abs(value).toFixed(1);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${rounded}%`;
}

type WeeklySnapshotCardInput = {
  comparison: ComparePeriodsResult | null;
  metrics: SalesSummary | null;
  topProduct: TopProductRow | null;
  windowLabel: string;
};

export type WeeklySnapshotCardContent = {
  askAiPrompt: string;
  evidence: Array<{ label: string; value: string }>;
  shareText: string;
  summary: string;
};

export function buildWeeklySnapshotCardContent(input: WeeklySnapshotCardInput): WeeklySnapshotCardContent | null {
  if (!input.metrics) {
    return null;
  }

  const revenueDelta = formatPercent(input.comparison?.revenue.percentageChange ?? null);
  const currency = input.metrics.currency;
  const topProductLine = input.topProduct
    ? `${input.topProduct.name} leads with ${formatCurrency(input.topProduct.revenue, currency)} in sales.`
    : "No top product was identified for this window.";
  const comparisonSentence =
    input.comparison?.revenue.percentageChange == null
      ? "Comparison with the previous week is unavailable."
      : `That is ${revenueDelta} versus the previous week.`;

  const summary = [
    `Revenue reached ${formatCurrency(input.metrics.revenue, currency)} from ${input.metrics.orderCount} orders in the ${input.windowLabel}.`,
    comparisonSentence,
    topProductLine,
  ].join(" ");

  return {
    askAiPrompt: "What happened this week, why did it change, and what should I do next?",
    evidence: [
      { label: "Revenue (7d)", value: formatCurrency(input.metrics.revenue, currency) },
      { label: "Orders (7d)", value: String(input.metrics.orderCount) },
      {
        label: "Revenue vs previous week",
        value:
          input.comparison?.revenue.percentageChange == null
            ? "Unavailable"
            : formatPercent(input.comparison.revenue.percentageChange),
      },
      ...(input.topProduct
        ? [
          {
              label: "Top product (7d)",
              value: input.topProduct.name,
            },
          ]
        : []),
    ],
    shareText: summary,
    summary,
  };
}
