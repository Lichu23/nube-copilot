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

export default async function SavedPage() {
  await requireActiveStore();

  const [summary, reports] = await Promise.all([
    getDashboardSyncSummary(),
    getSavedReportsForActiveStore(),
  ]);
  const storeName = summary.connection?.storeName ?? "Conecta tu tienda";
  const lastSyncLabel = getLastSyncLabel(summary.latestSyncJob?.finishedAt?.toISOString() ?? null);

  return (
    <AppShell
      active="saved"
      eyebrow="Análisis guardados"
      title="Volvé a tus decisiones importantes."
      description="Los reportes fijados se guardan en la base de datos de esta tienda y pueden reabrirse en el canvas."
      meta={
        <>
          {storeName} <span className="text-muted-foreground">· Tiendanube · {summary.connection ? "conectada" : "no conectada"}</span>
        </>
      }
    >
      <SavedReportsView initialReports={reports} lastSyncLabel={lastSyncLabel} />
    </AppShell>
  );
}
