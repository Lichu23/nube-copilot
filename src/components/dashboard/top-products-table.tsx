import type { TopProductRow } from "@/lib/db/queries/metrics";
import { formatCurrency } from "@/lib/formatting";

type TopProductsTableProps = {
  currency: string | null;
  helperLabel?: string;
  rows: TopProductRow[];
};

export function TopProductsTable({
  currency,
  helperLabel = "Esperando la sincronizacion inicial",
  rows,
}: TopProductsTableProps) {
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
            {hasRows ? (
              rows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.unitsSold}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(row.revenue, currency, {
                      maxFractionDigits: 2,
                      minFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center">
                  <p className="font-medium text-zinc-800">Todavia no hay productos con ventas en esta ventana.</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Sincroniza pedidos o cambia la ventana de comparacion para llenar este ranking.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
