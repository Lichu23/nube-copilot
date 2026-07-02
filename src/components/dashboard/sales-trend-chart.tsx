import type { SalesTrendPoint } from "@/lib/db/queries/metrics";
import { formatCurrency, formatShortDateLabel } from "@/lib/formatting";

type SalesTrendChartProps = {
  data: SalesTrendPoint[];
};

const chartWidth = 640;
const chartHeight = 220;
const padding = 28;

function buildLinePath(data: SalesTrendPoint[], maxRevenue: number) {
  if (data.length === 0) return "";

  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  return data
    .map((point, index) => {
      const x = data.length === 1 ? chartWidth / 2 : padding + (index / (data.length - 1)) * usableWidth;
      const normalizedRevenue = maxRevenue > 0 ? point.revenue / maxRevenue : 0;
      const y = padding + usableHeight - normalizedRevenue * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const maxRevenue = data.reduce((highest, point) => Math.max(highest, point.revenue), 0);
  const linePath = buildLinePath(data, maxRevenue);
  const areaPath = linePath
    ? `${linePath} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`
    : "";

  return (
    <section className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tendencia de ventas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Facturacion diaria en la ventana seleccionada.</p>
        </div>
        {maxRevenue > 0 ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Maximo {formatCurrency(maxRevenue, null)}
          </span>
        ) : null}
      </div>

      {data.length === 0 ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-black/10 bg-zinc-50 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-800">Todavia no hay ventas recientes para graficar.</p>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Sin pedidos sincronizados en esta ventana, el grafico queda vacio. Sincroniza la tienda o cambia la ventana de comparacion.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
          <div className="relative h-60 overflow-hidden rounded-xl bg-card p-3">
            <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Tendencia de facturacion diaria">
              <defs>
                <linearGradient id="salesTrendArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => {
                const y = padding + (line / 3) * (chartHeight - padding * 2);
                return <line key={line} x1={padding} x2={chartWidth - padding} y1={y} y2={y} className="stroke-border" strokeDasharray="4 6" />;
              })}
              {areaPath ? <path d={areaPath} fill="url(#salesTrendArea)" /> : null}
              {linePath ? <path d={linePath} fill="none" className="stroke-primary" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /> : null}
              {data.map((point, index) => {
                const usableWidth = chartWidth - padding * 2;
                const usableHeight = chartHeight - padding * 2;
                const x = data.length === 1 ? chartWidth / 2 : padding + (index / (data.length - 1)) * usableWidth;
                const y = padding + usableHeight - (maxRevenue > 0 ? point.revenue / maxRevenue : 0) * usableHeight;

                return (
                  <g key={point.day}>
                    <circle cx={x} cy={y} r="5" className="fill-card stroke-primary" strokeWidth="3">
                      <title>{`${formatCurrency(point.revenue, null)} en ${point.orderCount} pedidos`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
            {data.map((point) => (
              <div key={`${point.day}-label`} className="text-center text-xs text-muted-foreground">
                <div>{formatShortDateLabel(point.day)}</div>
                <div className="font-semibold text-foreground">
                  {formatCurrency(point.revenue, null)}
                </div>
                <div>{point.orderCount} pedidos</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
