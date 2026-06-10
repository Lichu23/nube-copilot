import type { TopProductRow } from "@/lib/db/queries/metrics";

type TopProductsTableProps = {
  currency: string | null;
  helperLabel?: string;
  rows: TopProductRow[];
};

function formatRevenue(value: number, currency: string | null) {
  return new Intl.NumberFormat("es-AR", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function TopProductsTable({
  currency,
  helperLabel = "Esperando la sincronizacion inicial",
  rows,
}: TopProductsTableProps) {
  const fallbackRows: TopProductRow[] = [{ name: "Sin datos todavia", orderCount: 0, revenue: 0, unitsSold: 0 }];
  const visibleRows = rows.length > 0 ? rows : fallbackRows;
  const hasRows = rows.length > 0;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Productos top por venta bruta</h2>
        <span className="text-xs text-zinc-500">{helperLabel}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-black/5">
        <table className="min-w-full divide-y divide-black/5 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Unidades</th>
              <th className="px-4 py-3 font-medium">Venta bruta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {visibleRows.map((row) => (
              <tr key={row.name}>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{hasRows ? row.unitsSold : "-"}</td>
                <td className="px-4 py-3">{hasRows ? formatRevenue(row.revenue, currency) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
