import Link from "next/link";

type LowStockAlertCardProps = {
  alert: {
    body: string;
    evidence: Array<{ label: string; value: string }>;
    severity: "critical" | "ok" | "warning";
    title: string;
  } | null;
  chatHref?: string;
};

export function LowStockAlertCard({ alert, chatHref }: LowStockAlertCardProps) {
  if (!alert) {
    return null;
  }

  const tone =
    alert.severity === "critical"
      ? "border-red-200 bg-red-50 text-red-950"
      : alert.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-emerald-200 bg-emerald-50 text-emerald-950";

  return (
    <section className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Inventario</p>
          <h2 className="mt-2 text-lg font-semibold">{alert.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{alert.body}</p>
        </div>

        {chatHref ? (
          <Link
            href={chatHref}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-white"
          >
            Analizar en chat
          </Link>
        ) : null}
      </div>

      {alert.evidence.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {alert.evidence.map((item) => (
            <article key={item.label} className="rounded-xl bg-white/70 p-3 text-zinc-950">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-1 text-xs text-zinc-600">{item.value}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
