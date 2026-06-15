import { getAnalystPreferencesForActiveStore, getDashboardSyncSummary } from "@/lib/db/client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireActiveStore();

  const params = await searchParams;
  const prompt = typeof params.prompt === "string" ? params.prompt : "";
  const [summary, preferences] = await Promise.all([
    getDashboardSyncSummary(),
    getAnalystPreferencesForActiveStore(),
  ]);

  return (
    <ChatPanel
      hasConnection={Boolean(summary.connection)}
      initialInput={prompt}
      initialPreferences={preferences}
      lastSyncAt={summary.latestSyncJob?.finishedAt?.toISOString() ?? null}
      storeName={summary.connection?.storeName ?? "Conecta tu tienda"}
    />
  );
}
