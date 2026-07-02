import { SavedReportsView } from "@/components/saved/saved-reports-view";
import { getDashboardSyncSummary, getSavedReportsForActiveStore } from "@/lib/db/client";
import { formatDateTimeLabel } from "@/lib/formatting";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Todav?a no sincronizado";
  const formatted = formatDateTimeLabel(lastSyncAt);
  return formatted === lastSyncAt ? "Sincronizado recientemente" : `Sincronizado ${formatted}`;
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const activeConnection = await requireActiveStore(storeId);
  const resolvedStoreId = storeId ?? activeConnection.storeId;

  const [summary, reports] = await Promise.all([
    getDashboardSyncSummary(resolvedStoreId),
    getSavedReportsForActiveStore(resolvedStoreId),
  ]);
  const lastSyncLabel = getLastSyncLabel(summary.latestSyncJob?.finishedAt?.toISOString() ?? null);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">An?lisis guardados</p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-foreground">
          Volv? a tus decisiones importantes.
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Los reportes fijados se guardan en la base de datos de esta tienda y pueden reabrirse en el canvas.
        </p>
      </section>

      <SavedReportsView initialReports={reports} lastSyncLabel={lastSyncLabel} storeId={resolvedStoreId} />
    </main>
  );
}
