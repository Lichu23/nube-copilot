import type { ReactNode } from "react";
import type { MetricDefinition } from "@/lib/metrics/definitions";

type MetricCardProps = {
  definition?: MetricDefinition;
  helper: string;
  icon?: ReactNode;
  label: string;
  tone?: "neutral" | "positive" | "warning";
  value: string;
};

export function MetricCard({ definition, helper, icon, label, tone = "neutral", value }: MetricCardProps) {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-rose-50 text-rose-700"
        : "bg-surface-muted text-foreground";

  return (
    <article className="surface-card rounded-[1.35rem] p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-foreground">
          {icon}
        </span>
        {helper ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
            {helper.split("·")[0].trim()}
          </span>
        ) : null}
      </div>
      <p className="mt-5 font-serif text-4xl leading-none tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
      {definition ? (
        <details className="mt-4 rounded-xl bg-surface-muted p-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Cómo se calcula</summary>
          <p className="mt-2">{definition.description}</p>
          <p className="mt-2">
            <span className="font-medium">Cálculo:</span> {definition.calculation}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Fuente: {definition.source}</p>
        </details>
      ) : null}
    </article>
  );
}
