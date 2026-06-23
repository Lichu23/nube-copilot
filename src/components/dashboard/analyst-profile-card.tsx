import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { getPreferenceSummary, type AnalystPreferences } from "@/lib/analyst/preferences";

export function AnalystProfileCard({
  preferences,
  storeId,
}: {
  preferences: AnalystPreferences;
  storeId?: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Lectura personalizada</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{getPreferenceSummary(preferences)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadencia {preferences.cadence.toLowerCase()} · tono {preferences.tone.toLowerCase()} · {preferences.category.toLowerCase()}.
            </p>
          </div>
        </div>

        <Link
          href={storeId ? `/settings?storeId=${storeId}` : "/settings"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-foreground"
        >
          Ajustar foco
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
