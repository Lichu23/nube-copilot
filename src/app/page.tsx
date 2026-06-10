import { getDashboardSyncSummary } from "@/lib/db/client";
import { ChatPanel } from "@/components/chat/chat-panel";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prompt = typeof params.prompt === "string" ? params.prompt : "";
  const summary = await getDashboardSyncSummary();

  return (
    <ChatPanel
      hasConnection={Boolean(summary.connection)}
      initialInput={prompt}
      lastSyncAt={summary.latestSyncJob?.finishedAt?.toISOString() ?? null}
      storeName={summary.connection?.storeName ?? "Conecta tu tienda"}
    />
  );
}
