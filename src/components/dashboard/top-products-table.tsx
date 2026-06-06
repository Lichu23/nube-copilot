const rows = [
  { name: "No data yet", units: "-", revenue: "-" },
];

type TopProductsTableProps = {
  helperLabel?: string;
};

export function TopProductsTable({ helperLabel = "Waiting for initial sync" }: TopProductsTableProps) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top products</h2>
        <span className="text-xs text-zinc-500">{helperLabel}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-black/5">
        <table className="min-w-full divide-y divide-black/5 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.units}</td>
                <td className="px-4 py-3">{row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
