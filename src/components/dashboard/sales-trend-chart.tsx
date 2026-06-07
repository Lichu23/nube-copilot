import type { SalesTrendPoint } from "@/lib/db/queries/metrics";

type SalesTrendChartProps = {
  data: SalesTrendPoint[];
};

function formatDayLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
      }).format(date);
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const maxRevenue = data.reduce((highest, point) => Math.max(highest, point.revenue), 0);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Sales trend</h2>
      {data.length === 0 ? (
        <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-black/10 bg-zinc-50 text-sm text-zinc-500">
          No recent order data yet.
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
                    title={`${point.revenue.toFixed(2)} revenue across ${point.orderCount} orders`}
                  />
                  <div className="text-center text-xs text-zinc-500">
                    <div>{formatDayLabel(point.day)}</div>
                    <div>{point.orderCount} orders</div>
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
