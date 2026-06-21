import { formatCurrency, formatDateLabel, formatDateRange, formatScalar } from "@/lib/formatting";
import { asNumber, asRecord } from "@/lib/type-guards";
import type { AnalystResponse, CanvasModel, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";

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
    case "get_average_order_value":
      return options?.days ? `Ticket promedio de los últimos ${options.days} días` : "Ticket promedio";
    case "get_sales_trend":
      return options?.days ? `Tendencia diaria de los últimos ${options.days} días` : "Tendencia diaria";
    case "get_monthly_trend":
      return "Tendencia mensual";
    case "get_top_products":
      return options?.days
        ? `Productos top por facturación de los últimos ${options.days} días`
        : "Productos top por facturación";
    case "get_weekly_business_snapshot":
      return normalized.includes("que paso") || normalized.includes("deberia hacer")
        ? "Resumen semanal y próximos pasos"
        : "Resumen semanal";
    case "get_low_stock_opportunities":
      return options?.isSkuRisk ? "SKUs sin stock o en riesgo" : "Oportunidades de stock bajo";
    case "get_next_week_priorities":
      return "Prioridades para la próxima semana";
    default:
      return "Respuesta del analista";
  }
}

export function buildSuggestedQuestions(toolName: string, options?: { days?: number }) {
  const periodLabel = options?.days ? `los últimos ${options.days} días` : "este período";

  switch (toolName) {
    case "compare_periods":
      return [
        "¿Qué producto explicó mejor esta diferencia?",
        "¿Cómo vienen las ventas por día en ese período?",
        "¿Qué acción concreta debería tomar esta semana?",
      ];
    case "get_sales_summary":
      return [
        `Compará ${periodLabel} contra el período anterior`,
        `Mostrame los productos top por facturación de ${periodLabel}`,
        "¿Qué debería hacer para mejorar estas ventas?",
      ];
    case "get_average_order_value":
      return [
        `Compará el ticket promedio de ${periodLabel} contra el período anterior`,
        "¿Qué productos o bundles empujan el ticket promedio?",
        "¿Cómo puedo subir el ticket promedio la próxima semana?",
      ];
    case "get_sales_trend":
      return [
        `¿Qué día tuvo más ventas en ${periodLabel}?`,
        "¿Cómo se ve la tendencia día por día?",
        "¿Qué pasó en el día pico?",
      ];
    case "get_monthly_trend":
      return [
        "¿Qué tendencia ves en mi negocio este mes?",
        "¿Cómo se compara este mes con el período anterior?",
        "¿Qué día explicó mejor el movimiento del mes?",
      ];
    case "get_top_products":
      return [
        `Compará estos productos contra el período anterior`,
        "¿Cuáles lideran por unidades vendidas?",
        "¿Qué productos tienen riesgo de quedarse sin stock?",
        "¿Qué producto debería promocionar primero?",
      ];
    case "get_weekly_business_snapshot":
      return [
        "¿Qué cambió contra la semana anterior?",
        "¿Qué producto debería revisar primero?",
        "¿Qué acción debería priorizar esta semana?",
      ];
    case "get_low_stock_opportunities":
      return [
        "¿Cuáles de estos productos vendieron más recientemente?",
        "¿Qué debería reponer primero?",
        "Mostrame los productos más vendidos de los últimos 30 días",
      ];
    case "get_next_week_priorities":
      return [
        "¿Qué producto debería empujar primero?",
        "¿Qué stock debería revisar antes de promocionar?",
        "¿Qué no conviene promocionar la próxima semana?",
      ];
    default:
      return [
        "Dame un resumen de ventas de los últimos 30 días",
        "Compará los últimos 30 días contra el período anterior",
        "¿Cuáles fueron mis productos top por facturación?",
      ];
  }
}

export function buildDefaultCanvasModel(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel {
  return {
    chart: null,
    definitions: [metricDefinitions.netRevenue, metricDefinitions.orderCount, metricDefinitions.unitsSold],
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

export { asNumber, asRecord, formatCurrency, formatDateLabel, formatDateRange, formatScalar };

