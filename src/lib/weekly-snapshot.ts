import type { ComparePeriodsResult, SalesSummary, TopProductRow } from "@/lib/db/queries/metrics";

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("es-AR", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "no disponible";
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
    ? `${input.topProduct.name} lidera con ${formatCurrency(input.topProduct.revenue, currency)} en ventas.`
    : "No se identifico un producto top para esta ventana.";
  const comparisonSentence =
    input.comparison?.revenue.percentageChange == null
      ? "La comparacion contra la semana anterior no esta disponible."
      : `Eso da ${revenueDelta} versus la semana anterior.`;

  const summary = [
    `La facturacion llego a ${formatCurrency(input.metrics.revenue, currency)} en ${input.metrics.orderCount} pedidos durante ${input.windowLabel}.`,
    comparisonSentence,
    topProductLine,
  ].join(" ");

  return {
    askAiPrompt: "Que paso esta semana, por que cambio y que deberia hacer ahora?",
    evidence: [
      { label: "Facturacion (7d)", value: formatCurrency(input.metrics.revenue, currency) },
      { label: "Pedidos (7d)", value: String(input.metrics.orderCount) },
      {
        label: "Facturacion vs semana anterior",
        value:
          input.comparison?.revenue.percentageChange == null
            ? "No disponible"
            : formatPercent(input.comparison.revenue.percentageChange),
      },
      ...(input.topProduct
        ? [
          {
              label: "Producto top (7d)",
              value: input.topProduct.name,
            },
          ]
        : []),
    ],
    shareText: summary,
    summary,
  };
}
