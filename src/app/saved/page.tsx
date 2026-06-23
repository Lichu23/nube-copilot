import { SavedReportsView } from "@/components/saved/saved-reports-view";
import { AppShell } from "@/components/layout/app-shell";
import { getDashboardSyncSummary, getSavedReportsForActiveStore } from "@/lib/db/client";
import { formatDateTimeLabel } from "@/lib/formatting";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Todavía no sincronizado";
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
  const storeName = summary.connection?.storeName ?? "Conecta tu tienda";
  const lastSyncLabel = getLastSyncLabel(summary.latestSyncJob?.finishedAt?.toISOString() ?? null);

  return (
    <AppShell
      active="saved"
      eyebrow="Análisis guardados"
      title="Volvé a tus decisiones importantes."
      description="Los reportes fijados se guardan en la base de datos de esta tienda y pueden reabrirse en el canvas."
      storeId={resolvedStoreId}
      meta={
        <>
          {storeName} <span className="text-muted-foreground">· Tiendanube · {summary.connection ? "conectada" : "no conectada"}</span>
        </>
      }
    >
      <SavedReportsView initialReports={reports} lastSyncLabel={lastSyncLabel} storeId={resolvedStoreId} />
    </AppShell>
  );
}
