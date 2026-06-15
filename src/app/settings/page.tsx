import { AnalystSettingsForm } from "@/components/settings/analyst-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { getAnalystPreferencesForActiveStore, getDashboardSyncSummary } from "@/lib/db/client";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireActiveStore();

  const [summary, preferences] = await Promise.all([
    getDashboardSyncSummary(),
    getAnalystPreferencesForActiveStore(),
  ]);
  const storeName = summary.connection?.storeName ?? "Conecta tu tienda";

  return (
    <AppShell
      active="settings"
      eyebrow="Ajustes del analista"
      title="Afiná el foco, el tono y la cadencia."
      description="Estas preferencias personalizan las sugerencias del chat y la lectura del panel."
      meta={
        <>
          {storeName} <span className="text-muted-foreground">· Tiendanube · {summary.connection ? "conectada" : "no conectada"}</span>
        </>
      }
    >
      <AnalystSettingsForm initialPreferences={preferences} />
    </AppShell>
  );
}
