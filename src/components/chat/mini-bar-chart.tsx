import type { ChartModel } from "@/lib/types";

export function MiniBarChart({ chart }: { chart: ChartModel }) {
  const maxValue = chart.data.reduce((highest, item) => {
    return Math.max(highest, item.current, item.previous ?? 0);
  }, 0);
  const hasComparisonPair = chart.variant === "comparison" && chart.data.length === 1 && chart.data[0].previous != null;
  const isRankingChart = chart.variant === "ranking" || chart.variant === "risk";

  if (hasComparisonPair) {
    const item = chart.data[0];
    const currentWidth = maxValue > 0 ? Math.max((item.current / maxValue) * 100, 6) : 6;
    const previousWidth = maxValue > 0 ? Math.max(((item.previous ?? 0) / maxValue) * 100, 6) : 6;
    const delta = item.current - (item.previous ?? 0);
    const deltaPct = item.previous && item.previous !== 0 ? (delta / item.previous) * 100 : null;
    const deltaLabel =
      deltaPct == null
        ? null
        : `${deltaPct > 0 ? "+" : deltaPct < 0 ? "-" : ""}${Math.abs(deltaPct).toFixed(1)}%`;
    const rows = [
      {
        barClassName: "bg-slate-400",
        dotClassName: "bg-slate-400",
        label: chart.previousLabel ?? "Período anterior",
        value: item.previous ?? 0,
        width: previousWidth,
      },
      {
        barClassName: "bg-primary",
        dotClassName: "bg-primary",
        label: chart.currentLabel ?? "Período actual",
        value: item.current,
        width: currentWidth,
      },
    ];
    const formatValue = (value: number) =>
      Number.isInteger(value)
        ? value.toLocaleString("es-AR")
        : value.toLocaleString("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

    return (
      <div className="mt-5 rounded-[1.5rem] bg-muted p-4">
        {chart.title ? <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{chart.title}</p> : null}

        <div className="rounded-[1.35rem] border border-border bg-card p-4 shadow-sm">
          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-2 md:grid-cols-[12rem_minmax(0,1fr)_5rem] md:items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.dotClassName}`} />
                  <span>{row.label}</span>
                </div>
                <div className="h-3 rounded-full bg-surface-muted">
                  <div className={`h-3 rounded-full transition-all duration-300 ${row.barClassName}`} style={{ width: `${row.width}%` }} />
                </div>
                <p className="text-right text-sm font-semibold text-foreground">{formatValue(row.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {deltaLabel ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Cambio vs período anterior: <span className={`font-semibold ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-foreground"}`}>{deltaLabel}</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            {chart.previousLabel ?? "Período anterior"}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            {chart.currentLabel ?? "Período actual"}
          </span>
        </div>
      </div>
    );
  }

  if (isRankingChart) {
    return (
      <div className="mt-5 rounded-[1.5rem] bg-muted p-4">
        {chart.title ? <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{chart.title}</p> : null}
        <div className="space-y-4">
          {chart.data.map((item) => {
            const width = maxValue > 0 ? Math.max((item.current / maxValue) * 100, 6) : 6;

            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <p className="line-clamp-1 text-foreground">{item.label}</p>
                  <p className="shrink-0 font-medium text-muted-foreground">{item.current}</p>
                </div>
                <div className="h-3 rounded-full bg-card">
                  <div
                    className={`h-3 rounded-full ${chart.variant === "risk" ? "bg-orange-500" : "bg-accent"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[1.5rem] bg-muted p-4">
      {chart.title ? <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{chart.title}</p> : null}
      <div className="flex h-48 items-stretch gap-3">
        {chart.data.map((item) => {
          const currentHeight = maxValue > 0 ? Math.max((item.current / maxValue) * 100, 8) : 8;
          const previousHeight = item.previous != null ? Math.max(((item.previous ?? 0) / maxValue) * 100, 8) : 0;

          return (
            <div key={item.label} className="flex min-w-0 h-full flex-1 flex-col items-center justify-end gap-3">
              <div className="flex h-full w-full min-h-0 items-end justify-center gap-2">
                {item.previous != null ? (
                  <div
                    className="w-full max-w-8 rounded-t-2xl bg-secondary"
                    style={{ height: `${previousHeight}%` }}
                    title={`${chart.previousLabel ?? "Anterior"} · ${item.label}`}
                  />
                ) : null}
                <div
                  className="w-full max-w-8 rounded-t-2xl bg-accent"
                  style={{ height: `${currentHeight}%` }}
                  title={`${chart.currentLabel ?? "Actual"} · ${item.label}`}
                />
              </div>
              <p className="line-clamp-2 text-center text-xs leading-4 text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
      {(chart.currentLabel || chart.previousLabel) ? (
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {chart.previousLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-secondary" />
              {chart.previousLabel}
            </span>
          ) : null}
          {chart.currentLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-accent" />
              {chart.currentLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
