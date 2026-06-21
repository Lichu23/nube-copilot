import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { asRecord, buildIntentTitle, formatCurrency, formatScalar } from "./helpers";

export function buildNextWeekPrioritiesCanvas(
  result: AnalystResponse,
  primary: ToolResult,
  userQuestion: string,
): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const topProducts = Array.isArray(output.topProducts) ? output.topProducts : [];
  const lowStockOpportunities = Array.isArray(output.lowStockOpportunities) ? output.lowStockOpportunities : [];
  const summary = asRecord(output.summary);
  const window = asRecord(output.window);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;
  const topProduct = topProducts[0] ? asRecord(topProducts[0]) : null;
  const lowStockLead = lowStockOpportunities[0] ? asRecord(lowStockOpportunities[0]) : null;

  return {
    chart: null,
    definitions: [metricDefinitions.topProductsRevenue, metricDefinitions.lowStock, metricDefinitions.unitsSold],
    filters: ["Priorizado por demanda reciente y stock"],
    metrics: [
      {
        definition: metricDefinitions.topProductsRevenue,
        label: "Producto foco",
        value: typeof topProduct?.name === "string" ? topProduct.name : "-",
      },
      {
        definition: metricDefinitions.lowStock,
        label: "Stock a revisar",
        value: lowStockLead ? formatScalar(lowStockOpportunities.length) : "0",
      },
      {
        definition: metricDefinitions.netRevenue,
        label: "Facturación semanal",
        value: formatCurrency(typeof summary?.revenue === "number" ? summary.revenue : 0, currency),
      },
    ],
    source: "Tiendanube · Órdenes + stock",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: null,
    title: buildIntentTitle(primary.toolName, userQuestion),
    userQuestion,
    windowLabel: typeof window?.label === "string" ? window.label : "Próxima semana",
  };
}
