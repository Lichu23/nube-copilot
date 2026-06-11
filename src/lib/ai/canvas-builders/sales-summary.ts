import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatDateRange, formatScalar } from "./helpers";

export function buildSalesSummaryCanvas(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const summary = asRecord(output.summary);
  const window = asRecord(output.window);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;
  const revenue = asNumber(summary?.revenue) ?? 0;
  const orderCount = asNumber(summary?.orderCount) ?? 0;
  const unitsSold = asNumber(summary?.unitsSold) ?? 0;
  const averageOrderValue = asNumber(summary?.averageOrderValue) ?? 0;

  return {
    chart: {
      data: [
        { current: revenue, label: "Facturación" },
        { current: orderCount, label: "Pedidos" },
        { current: unitsSold, label: "Unidades vendidas" },
      ],
    },
    filters: ["Solo pedidos pagos"],
    metrics: [
      { label: "Facturación", value: formatCurrency(revenue, currency) },
      { label: "Pedidos", value: formatScalar(orderCount) },
      { label: "AOV", value: formatCurrency(averageOrderValue, currency) },
      { label: "Unidades vendidas", value: formatScalar(unitsSold) },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Métrica", "Valor"],
      rows: [
        ["Facturación", formatCurrency(revenue, currency)],
        ["Pedidos", formatScalar(orderCount)],
        ["Unidades vendidas", formatScalar(unitsSold)],
        ["Ticket promedio", formatCurrency(averageOrderValue, currency)],
      ],
    },
    title: buildIntentTitle(primary.toolName, userQuestion),
    userQuestion,
    windowLabel: formatDateRange(
      typeof window?.startDate === "string" ? window.startDate : null,
      typeof window?.endDate === "string" ? window.endDate : null,
    ),
  };
}
