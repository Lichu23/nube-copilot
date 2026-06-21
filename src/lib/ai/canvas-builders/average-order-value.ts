import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatScalar } from "./helpers";

export function buildAverageOrderValueCanvas(
  result: AnalystResponse,
  primary: ToolResult,
  userQuestion: string,
): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const summary = asRecord(output.summary);
  const window = asRecord(output.window);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;
  const averageOrderValue = asNumber(summary?.averageOrderValue) ?? 0;
  const revenue = asNumber(summary?.revenue) ?? 0;
  const orderCount = asNumber(summary?.orderCount) ?? 0;
  const days = asNumber(window?.days) ?? undefined;
  const periodLabel = days ? `Últimos ${days} días` : "Ventana elegida";

  return {
    chart: null,
    definitions: [
      metricDefinitions.averageOrderValue,
      metricDefinitions.netRevenue,
      metricDefinitions.orderCount,
    ],
    filters: ["Solo pedidos pagos"],
    metrics: [
      { definition: metricDefinitions.averageOrderValue, label: "Ticket promedio", value: formatCurrency(averageOrderValue, currency) },
      { definition: metricDefinitions.netRevenue, label: "Facturación", value: formatCurrency(revenue, currency) },
      { definition: metricDefinitions.orderCount, label: "Pedidos", value: formatScalar(orderCount) },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: null,
    title: buildIntentTitle(primary.toolName, userQuestion, { days }),
    userQuestion,
    windowLabel: periodLabel,
  };
}
