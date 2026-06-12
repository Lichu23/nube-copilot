import { formatCurrency, formatDateRange, formatScalar } from "@/lib/formatting";
import { asNumber, asRecord } from "@/lib/type-guards";
import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";

export function getPrimaryToolResult(toolResults: ToolResult[]) {
  return toolResults[toolResults.length - 1] ?? null;
}

export function normalizeIntentText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildIntentTitle(toolName: string, userQuestion: string, options?: { days?: number; isSkuRisk?: boolean }) {
  const normalized = normalizeIntentText(userQuestion);

  switch (toolName) {
    case "compare_periods":
      return normalized.includes("ingresos") ? "Comparación de ingresos" : "Comparación entre períodos";
    case "get_sales_summary":
      return options?.days ? `Resumen de ventas de los últimos ${options.days} días` : "Resumen de ventas";
    case "get_top_products":
      if (normalized.includes("producto") && normalized.includes("vendio mas")) {
        return "Producto más vendido de la semana";
      }

      return options?.days ? `Productos top de los últimos ${options.days} días` : "Productos top";
    case "get_weekly_business_snapshot":
      return normalized.includes("que paso") || normalized.includes("deberia hacer")
        ? "Resumen semanal y próximos pasos"
        : "Resumen semanal";
    case "get_low_stock_opportunities":
      return options?.isSkuRisk ? "SKUs sin stock o en riesgo" : "Oportunidades de stock bajo";
    default:
      return "Respuesta del analista";
  }
}

export function buildDefaultCanvasModel(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel {
  return {
    chart: null,
    filters: ["Respuesta validada por backend"],
    metrics: result.evidence.slice(0, 4).map((item) => ({
      helper: item.period,
      label: item.metric,
      value: formatScalar(item.value),
    })),
    source: "Tiendanube",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Métrica", "Valor", "Período"],
      rows: result.evidence.map((item) => [item.metric, formatScalar(item.value), item.period ?? "-"]),
    },
    title: buildIntentTitle(primary.toolName, userQuestion),
    userQuestion,
    windowLabel: "Datos sincronizados actuales",
  };
}

export { asNumber, asRecord, formatCurrency, formatDateRange, formatScalar };
