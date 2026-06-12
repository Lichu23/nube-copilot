import type { LowStockOpportunityRow } from "@/lib/db/queries/metrics";

type LowStockAlertInput = {
  recentDays: number;
  rows: LowStockOpportunityRow[];
  stockThreshold: number;
};

export function buildLowStockAlert(input: LowStockAlertInput) {
  const outOfStockCount = input.rows.filter((row) => row.stock <= 0).length;
  const topRisk = input.rows[0] ?? null;

  if (!topRisk) {
    return {
      body: `No hay variantes por debajo de ${input.stockThreshold} unidades con la configuracion actual.`,
      evidence: [],
      severity: "ok" as const,
      title: "Stock bajo",
    };
  }

  return {
    body:
      outOfStockCount > 0
        ? `${outOfStockCount} variante${outOfStockCount === 1 ? " ya esta" : "s ya estan"} sin stock. Repon primero ${topRisk.name}.`
        : `${input.rows.length} variante${input.rows.length === 1 ? " esta" : "s estan"} por debajo de ${input.stockThreshold} unidades. Revisa primero ${topRisk.name}.`,
    evidence: input.rows.slice(0, 3).map((row) => ({
      label: row.sku ? `${row.name} (${row.sku})` : row.name,
      value: `${row.stock} en stock - ${row.recentUnitsSold} vendidas en ${input.recentDays}d`,
    })),
    severity: outOfStockCount > 0 ? ("critical" as const) : ("warning" as const),
    title: "Alerta de stock bajo",
  };
}
