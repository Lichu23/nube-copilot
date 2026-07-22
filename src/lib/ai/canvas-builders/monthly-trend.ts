import type { AnalystResponse, CanvasModel, ChartDatum, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatDateLabel, formatScalar, normalizeIntentText } from "./helpers";

function formatCappedRevenueChange(currentRevenue: number, previousRevenue: number) {
  if (previousRevenue <= 0) {
    return "—";
  }

  const percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  const cappedChange = Math.min(Math.abs(Math.round(percentageChange)), 999);

  return `${cappedChange}%`;
}

export function buildMonthlyTrendCanvas(
  result: AnalystResponse,
  primary: ToolResult,
  userQuestion: string,
): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const trend = Array.isArray(output.trend) ? output.trend : [];
  const summary = asRecord(output.summary);
  const comparison = asRecord(output.comparison);
  const window = asRecord(output.window);
  const previousWindow = asRecord(output.previousWindow);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;
  const peakDay = asRecord(output.peakDay);
  const peakDayLabel = typeof peakDay?.day === "string" ? formatDateLabel(peakDay.day) : "-";
  const peakDayRevenue = asNumber(peakDay?.revenue) ?? 0;
  const peakDayOrders = asNumber(peakDay?.orderCount) ?? 0;
  const comparisonRevenue = asRecord(comparison?.revenue);
  const currentRevenue = asNumber(comparisonRevenue?.current) ?? 0;
  const previousRevenue = asNumber(comparisonRevenue?.previous) ?? 0;
  const revenueChangeLabel = formatCappedRevenueChange(currentRevenue, previousRevenue);
  const normalizedQuestion = normalizeIntentText(userQuestion);
  const isPeakDayQuestion =
    normalizedQuestion.includes("que dia") ||
    normalizedQuestion.includes("dia que") ||
    normalizedQuestion.includes("dia tuv") ||
    normalizedQuestion.includes("mejor dia") ||
    normalizedQuestion.includes("pico de ventas");

  const rows = trend
    .map((item) => {
      const record = asRecord(item);
      if (!record || typeof record.day !== "string") return null;

      return [
        formatDateLabel(record.day),
        formatCurrency(asNumber(record.revenue) ?? 0, currency),
        formatScalar(asNumber(record.orderCount) ?? 0),
      ];
    })
    .filter((row): row is string[] => Boolean(row));
  const peakDayRows =
    typeof peakDay?.day === "string"
      ? [[peakDayLabel, formatCurrency(peakDayRevenue, currency), formatScalar(peakDayOrders)]]
      : rows;

  return {
    chart: {
      data: isPeakDayQuestion && typeof peakDay?.day === "string"
        ? [
            {
              current: peakDayRevenue,
              label: peakDayLabel,
            },
          ]
        : trend
            .map((item) => {
              const record = asRecord(item);
              if (!record || typeof record.day !== "string") return null;
              return {
                current: asNumber(record.revenue) ?? 0,
                label: formatDateLabel(record.day),
              };
            })
            .filter((item): item is ChartDatum => Boolean(item)),
      title: isPeakDayQuestion ? "Día con más ventas" : "Tendencia mensual por día",
      variant: isPeakDayQuestion ? "ranking" : undefined,
    },
    definitions: [metricDefinitions.netRevenue, metricDefinitions.orderCount, metricDefinitions.averageOrderValue, metricDefinitions.unitsSold],
    filters: ["Mes actual", "Comparación contra período equivalente"],
    metrics: [
      {
        definition: metricDefinitions.netRevenue,
        label: "Facturación mes a la fecha",
        value: formatCurrency(asNumber(summary?.revenue) ?? 0, currency),
      },
      {
        definition: metricDefinitions.netRevenue,
        label: "Cambio vs período previo",
        value: revenueChangeLabel,
      },
      {
        definition: metricDefinitions.orderCount,
        label: "Día pico",
        value: peakDayLabel,
      },
      {
        definition: metricDefinitions.orderCount,
        label: "Pedidos mes a la fecha",
        value: formatScalar(asNumber(summary?.orderCount) ?? 0),
      },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Día", "Facturación", "Pedidos"],
      rows: isPeakDayQuestion ? peakDayRows : rows,
    },
    title: buildIntentTitle(primary.toolName, userQuestion, { days: asNumber(window?.days) ?? undefined }),
    userQuestion,
    windowLabel:
      typeof window?.startDate === "string" && typeof window?.endDate === "string"
        ? `${formatDateLabel(window.startDate)} – ${formatDateLabel(window.endDate)}`
        : typeof previousWindow?.startDate === "string"
          ? "Mes actual"
          : "Tendencia mensual",
  };
}
