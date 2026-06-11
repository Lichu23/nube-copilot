import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatScalar } from "./helpers";

export function buildWeeklySnapshotCanvas(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const summary = asRecord(output.summary);
  const summaryMetrics = summary ? asRecord(summary.summary) : null;
  const comparison = asRecord(output.comparison);
  const comparisonMetrics = comparison ? asRecord(comparison.comparison) : null;
  const revenueComparison = comparisonMetrics ? asRecord(comparisonMetrics.revenue) : null;
  const currency = typeof summaryMetrics?.currency === "string" ? summaryMetrics.currency : null;
  const revenue = asNumber(summaryMetrics?.revenue) ?? 0;
  const orders = asNumber(summaryMetrics?.orderCount) ?? 0;
  const averageOrderValue = asNumber(summaryMetrics?.averageOrderValue) ?? 0;
  const unitsSold = asNumber(summaryMetrics?.unitsSold) ?? 0;

  return {
    chart: {
      currentLabel: "Últimos 7 días",
      data: [
        {
          current: revenue,
          label: "Facturación",
          previous: asNumber(revenueComparison?.previous) ?? 0,
        },
      ],
      previousLabel: "7 días anteriores",
    },
    filters: ["Solo pedidos pagos", "Vista de resumen semanal"],
    metrics: [
      { label: "Facturación", value: formatCurrency(revenue, currency) },
      { label: "Pedidos", value: formatScalar(orders) },
      { label: "AOV", value: formatCurrency(averageOrderValue, currency) },
      { label: "Unidades vendidas", value: formatScalar(unitsSold) },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Métrica", "Últimos 7 días", "7 días anteriores"],
      rows: [
        ["Facturación", formatCurrency(revenue, currency), formatCurrency(asNumber(revenueComparison?.previous) ?? 0, currency)],
        ["Pedidos", formatScalar(orders), "—"],
        ["Ticket promedio", formatCurrency(averageOrderValue, currency), "—"],
        ["Unidades vendidas", formatScalar(unitsSold), "—"],
      ],
    },
    title: buildIntentTitle(primary.toolName, userQuestion),
    userQuestion,
    windowLabel:
      typeof output.window === "object" && output.window && "label" in output.window
        ? String((output.window as Record<string, unknown>).label)
        : "Últimos 7 días",
  };
}
