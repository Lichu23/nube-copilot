import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatDateRange, formatScalar } from "./helpers";

export function buildComparePeriodsCanvas(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const comparison = asRecord(output.comparison);
  const currentWindow = asRecord(output.currentWindow);
  const previousWindow = asRecord(output.previousWindow);
  const revenue = comparison ? asRecord(comparison.revenue) : null;
  const orders = comparison ? asRecord(comparison.orderCount) : null;
  const unitsSold = comparison ? asRecord(comparison.unitsSold) : null;
  const averageOrderValue = comparison ? asRecord(comparison.averageOrderValue) : null;
  const currency = typeof comparison?.currency === "string" ? comparison.currency : null;
  const currentLabel = typeof currentWindow?.label === "string" ? currentWindow.label : "Período actual";
  const previousLabel = typeof previousWindow?.label === "string" ? previousWindow.label : "Período anterior";

  return {
    chart: revenue
      ? {
          currentLabel,
          data: [
            {
              current: asNumber(revenue.current) ?? 0,
              label: "Facturación",
              previous: asNumber(revenue.previous) ?? 0,
            },
          ],
          previousLabel,
        }
      : null,
    filters: ["Solo pedidos pagos", "Comparación entre períodos"],
    metrics: [
      { helper: currentLabel, label: "Facturación", value: formatCurrency(asNumber(revenue?.current) ?? 0, currency) },
      { helper: currentLabel, label: "Pedidos", value: formatScalar(asNumber(orders?.current) ?? 0) },
      { helper: currentLabel, label: "AOV", value: formatCurrency(asNumber(averageOrderValue?.current) ?? 0, currency) },
      { helper: currentLabel, label: "Unidades vendidas", value: formatScalar(asNumber(unitsSold?.current) ?? 0) },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Métrica", currentLabel, previousLabel],
      rows: [
        ["Facturación", formatCurrency(asNumber(revenue?.current) ?? 0, currency), formatCurrency(asNumber(revenue?.previous) ?? 0, currency)],
        ["Pedidos", formatScalar(asNumber(orders?.current) ?? 0), formatScalar(asNumber(orders?.previous) ?? 0)],
        ["Unidades vendidas", formatScalar(asNumber(unitsSold?.current) ?? 0), formatScalar(asNumber(unitsSold?.previous) ?? 0)],
        ["AOV", formatCurrency(asNumber(averageOrderValue?.current) ?? 0, currency), formatCurrency(asNumber(averageOrderValue?.previous) ?? 0, currency)],
      ],
    },
    title: buildIntentTitle(primary.toolName, userQuestion),
    userQuestion,
    windowLabel: formatDateRange(
      typeof currentWindow?.startDate === "string" ? currentWindow.startDate : null,
      typeof currentWindow?.endDate === "string" ? currentWindow.endDate : null,
    ),
  };
}
