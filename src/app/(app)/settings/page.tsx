import { AnalystSettingsForm } from "@/components/settings/analyst-settings-form";
import { getAnalystPreferencesForActiveStore } from "@/lib/db/client";
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
  const preferences = await getAnalystPreferencesForActiveStore(resolvedStoreId);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Ajustes del analista</p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-foreground">
          Afin? el foco, el tono y la cadencia.
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Estas preferencias personalizan las sugerencias del chat y la lectura del panel.
        </p>
      </section>

      <AnalystSettingsForm initialPreferences={preferences} storeId={resolvedStoreId} />
    </main>
  );
}
