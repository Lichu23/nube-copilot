import type { SalesTrendPoint } from "@/lib/db/queries/metrics";
import { formatShortDateLabel } from "@/lib/formatting";

type SalesTrendChartProps = {
  data: SalesTrendPoint[];
};

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const maxRevenue = data.reduce((highest, point) => Math.max(highest, point.revenue), 0);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Tendencia de ventas</h2>
      {data.length === 0 ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-black/10 bg-zinc-50 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-800">Todavia no hay ventas recientes para graficar.</p>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Sin pedidos sincronizados en esta ventana, el grafico queda vacio. Sincroniza la tienda o cambia la ventana de comparacion.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50 p-4">
          <div className="flex h-48 items-end gap-3">
            {data.map((point) => {
              const height = maxRevenue > 0 ? Math.max((point.revenue / maxRevenue) * 100, 8) : 8;

              return (
                <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-black/80"
                    style={{ height: `${height}%` }}
                    title={`${point.revenue.toFixed(2)} de facturacion en ${point.orderCount} pedidos`}
                  />
                  <div className="text-center text-xs text-zinc-500">
                    <div>{formatShortDateLabel(point.day)}</div>
                    <div>{point.orderCount} pedidos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
