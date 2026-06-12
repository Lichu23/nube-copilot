import type { MetricDefinition } from "@/lib/metrics/definitions";

type MetricCardProps = {
  definition?: MetricDefinition;
  label: string;
  value: string;
  helper: string;
};

export function MetricCard({ definition, label, value, helper }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-zinc-600">{helper}</p>
      {definition ? (
        <details className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
          <summary className="cursor-pointer font-medium text-zinc-950">Cómo se calcula</summary>
          <p className="mt-2">{definition.description}</p>
          <p className="mt-2">
            <span className="font-medium">Cálculo:</span> {definition.calculation}.
          </p>
          <p className="mt-1 text-xs text-zinc-500">Fuente: {definition.source}</p>
        </details>
      ) : null}
    </article>
  );
}
