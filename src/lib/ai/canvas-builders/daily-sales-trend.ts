import type { AnalystResponse, CanvasModel, ChartDatum, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatDateLabel, formatScalar } from "./helpers";

export function buildDailySalesTrendCanvas(
  result: AnalystResponse,
  primary: ToolResult,
  userQuestion: string,
): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const trend = Array.isArray(output.trend) ? output.trend : [];
  const summary = asRecord(output.summary);
  const window = asRecord(output.window);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;
  const peakDay = asRecord(output.peakDay);

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

  return {
    chart: {
      data: trend
        .map((item) => {
          const record = asRecord(item);
          if (!record || typeof record.day !== "string") return null;
          return {
            current: asNumber(record.revenue) ?? 0,
            label: formatDateLabel(record.day),
          };
        })
        .filter((item): item is ChartDatum => Boolean(item)),
      title: "Ventas por día",
    },
    definitions: [metricDefinitions.netRevenue, metricDefinitions.orderCount, metricDefinitions.averageOrderValue],
    filters: ["Pedidos pagos", "Agrupado por día"],
    metrics: [
      {
        definition: metricDefinitions.netRevenue,
        label: "Día pico",
        value: typeof peakDay?.day === "string" ? formatDateLabel(peakDay.day) : "-",
      },
      {
        definition: metricDefinitions.orderCount,
        label: "Pedidos del pico",
        value: formatScalar(asNumber(peakDay?.orderCount) ?? 0),
      },
      {
        definition: metricDefinitions.netRevenue,
        label: "Facturación total",
        value: formatCurrency(asNumber(summary?.revenue) ?? 0, currency),
      },
    ],
    source: "Tiendanube · API de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Día", "Facturación", "Pedidos"],
      rows,
    },
    title: buildIntentTitle(primary.toolName, userQuestion, { days: asNumber(window?.days) ?? undefined }),
    userQuestion,
    windowLabel:
      typeof window?.startDate === "string" && typeof window?.endDate === "string"
        ? `${formatDateLabel(window.startDate)} – ${formatDateLabel(window.endDate)}`
        : typeof window?.days === "number"
          ? `Últimos ${window.days} días`
          : "Tendencia diaria",
  };
}
