import type { AnalystResponse, CanvasModel, ChartDatum, ToolResult } from "@/lib/types";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { asNumber, asRecord, buildIntentTitle, formatCurrency, formatDateRange, formatScalar } from "./helpers";

export function buildTopProductsCanvas(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const products = Array.isArray(output.products) ? output.products : [];
  const summary = asRecord(output.summary);
  const window = asRecord(output.window);
  const currency = typeof summary?.currency === "string" ? summary.currency : null;

  const rows = products
    .map((item) => {
      const record = asRecord(item);
      if (!record || typeof record.name !== "string") return null;
      return [
        record.name,
        formatScalar(asNumber(record.unitsSold) ?? 0),
        formatCurrency(asNumber(record.revenue) ?? 0, currency),
        formatScalar(asNumber(record.orderCount) ?? 0),
      ];
    })
    .filter((row): row is string[] => Boolean(row));

  return {
    chart: {
      data: products
        .map((item) => {
          const record = asRecord(item);
          if (!record || typeof record.name !== "string") return null;
          return {
            current: asNumber(record.revenue) ?? 0,
            label: record.name,
          };
        })
        .filter((item): item is ChartDatum => Boolean(item)),
      title: "Ranking por facturación",
      variant: "ranking",
    },
    definitions: [metricDefinitions.topProductsRevenue, metricDefinitions.unitsSold, metricDefinitions.orderCount],
    filters: ["Ordenado por facturación bruta del producto"],
    metrics: [
      { label: "Productos", value: formatScalar(rows.length) },
      { definition: metricDefinitions.topProductsRevenue, label: "Facturación bruta", value: formatCurrency(asNumber(summary?.revenue) ?? 0, currency) },
      { label: "Producto top", value: rows[0]?.[0] ?? "-" },
    ],
    source: "Tiendanube · Órdenes + ítems de pedido",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Producto", "Unidades", "Facturación", "Pedidos"],
      rows,
    },
    title: buildIntentTitle(primary.toolName, userQuestion, {
      days: asNumber(window?.days) ?? undefined,
    }),
    userQuestion,
    windowLabel: formatDateRange(
      typeof window?.startDate === "string" ? window.startDate : null,
      typeof window?.endDate === "string" ? window.endDate : null,
    ),
  };
}
