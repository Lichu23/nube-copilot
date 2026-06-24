import { AnalystSettingsForm } from "@/components/settings/analyst-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { getAnalystPreferencesForActiveStore, getDashboardSyncSummary } from "@/lib/db/client";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const activeConnection = await requireActiveStore(storeId);
  const resolvedStoreId = storeId ?? activeConnection.storeId;

  const [summary, preferences] = await Promise.all([
    getDashboardSyncSummary(resolvedStoreId),
    getAnalystPreferencesForActiveStore(resolvedStoreId),
  ]);
  const storeName = summary.connection?.storeName ?? "Conecta tu tienda";

  return (
    <AppShell
      active="settings"
      eyebrow="Ajustes del analista"
      title="Afiná el foco, el tono y la cadencia."
      description="Estas preferencias personalizan las sugerencias del chat y la lectura del panel."
      storeId={resolvedStoreId}
      meta={
        <>
          {storeName} <span className="text-muted-foreground">· Tiendanube · {summary.connection ? "conectada" : "no conectada"}</span>
        </>
      }
    >
      <AnalystSettingsForm initialPreferences={preferences} storeId={resolvedStoreId} />
    </AppShell>
  );
}

