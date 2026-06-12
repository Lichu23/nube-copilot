import type { AnalystResponse, CanvasModel, ChartDatum, ToolResult } from "@/lib/types";
import { asNumber, asRecord, buildIntentTitle, formatScalar, normalizeIntentText } from "./helpers";

export function buildLowStockCanvas(result: AnalystResponse, primary: ToolResult, userQuestion: string): CanvasModel | null {
  const output = asRecord(primary.output);
  if (!output) return null;

  const opportunities = Array.isArray(output.opportunities) ? output.opportunities : [];
  const window = asRecord(output.window);
  const threshold = asNumber(window?.stockThreshold) ?? 0;
  const asksForSkuRisk = normalizeIntentText(userQuestion).includes("sku");

  const rows = opportunities
    .map((item) => {
      const record = asRecord(item);
      if (!record || typeof record.name !== "string") return null;
      return [
        record.name,
        typeof record.sku === "string" && record.sku.trim().length > 0 ? record.sku : "SKU no disponible",
        formatScalar(asNumber(record.stock) ?? 0),
        formatScalar(asNumber(record.recentUnitsSold) ?? 0),
      ];
    })
    .filter((row): row is string[] => Boolean(row));

  return {
    chart: {
      data: opportunities
        .map((item) => {
          const record = asRecord(item);
          if (!record || typeof record.name !== "string") return null;
          return {
            current: asNumber(record.recentUnitsSold) ?? 0,
            label: record.name,
          };
        })
        .filter((item): item is ChartDatum => Boolean(item)),
      title: "Demanda reciente con stock bajo",
      variant: "risk",
    },
    filters: [`Umbral de stock: ${threshold} unidades`, "Las ventas recientes ordenan la urgencia"],
    metrics: [
      { label: "Variantes marcadas", value: formatScalar(rows.length) },
      {
        label: "Sin stock ahora",
        value: formatScalar(opportunities.filter((item) => (asNumber(asRecord(item)?.stock) ?? 0) <= 0).length),
      },
      { label: "Umbral", value: `${threshold} unidades` },
    ],
    source: "Tiendanube · Productos + demanda de órdenes",
    summary: result.answer,
    summaryPoints: result.recommendedActions,
    table: {
      columns: ["Producto", "SKU", "Stock", "Ventas recientes"],
      rows,
    },
    title: buildIntentTitle(primary.toolName, userQuestion, { isSkuRisk: asksForSkuRisk }),
    userQuestion,
    windowLabel: "Stock actual",
  };
}
