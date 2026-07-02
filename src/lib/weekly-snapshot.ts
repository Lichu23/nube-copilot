import type { ComparePeriodsResult, SalesSummary, TopProductRow } from "@/lib/db/queries/metrics";



import { formatCurrency, formatPercent } from "@/lib/formatting";

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

  const revenueDelta = formatPercent(input.comparison?.revenue.percentageChange ?? 0);

  const currency = input.metrics.currency;
  const topProductLine = input.topProduct
    ? `${input.topProduct.name} lidera con ${formatCurrency(input.topProduct.revenue, currency)} en ventas.`
    : "No se identific? un producto top para esta ventana.";
  const comparisonSentence =
    input.comparison?.revenue.percentageChange == null
      ? "La comparación contra la semana anterior no esta disponible."
      : `Eso da ${revenueDelta} versus la semana anterior.`;

  const summary = [
    `La facturacion llego a ${formatCurrency(input.metrics.revenue, currency)} en ${input.metrics.orderCount} pedidos durante ${input.windowLabel}.`,
    comparisonSentence,
    topProductLine,
  ].join(" ");

  return {
    askAiPrompt: "Que paso esta semana, por que cambio y que deberia hacer ahora?",
    evidence: [
      { label: "Facturación (7d)", value: formatCurrency(input.metrics.revenue, currency) },
      { label: "Pedidos (7d)", value: String(input.metrics.orderCount) },
      {
        label: "Facturación vs semana anterior",
        value:
          input.comparison?.revenue.percentageChange == null
            ? "No disponible"
            : formatPercent(input.comparison.revenue.percentageChange ?? 0),


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
