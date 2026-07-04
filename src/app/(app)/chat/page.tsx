import { getAnalystPreferencesForActiveStore, getDashboardSyncSummary } from "@/lib/db/client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { toIsoTimestamp } from "@/lib/dashboard/data-transformer";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const activeConnection = await requireActiveStore(storeId);
  const resolvedStoreId = storeId ?? activeConnection.storeId;
  const prompt = typeof params.prompt === "string" ? params.prompt : "";
  const [summary, preferences] = await Promise.all([
    getDashboardSyncSummary(resolvedStoreId),
    getAnalystPreferencesForActiveStore(resolvedStoreId),
  ]);


  return (
    <ChatPanel
      hasConnection={Boolean(summary.connection)}
      initialInput={prompt}
      initialPreferences={preferences}
      lastSyncAt={toIsoTimestamp(summary.latestSyncJob?.finishedAt)}
      storeId={summary.connection?.storeId ?? resolvedStoreId}
      storeName={summary.connection?.storeName ?? "Conecta tu tienda"}
    />
  );
}
