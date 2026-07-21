import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardCacheTag, getSidebarCacheTag } from "@/lib/dashboard/cache";
import { getActiveTiendanubeConnection, resolveActiveStoreId } from "@/lib/db/client";
import { runInitialSync, startTiendanubeSync } from "@/lib/tiendanube/sync";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const storeId = typeof body?.storeId === "string" ? body.storeId : undefined;
  const resolvedStore = storeId
    ? await getActiveTiendanubeConnection(storeId)
    : await resolveActiveStoreId(undefined);

  if (!resolvedStore) {
    return NextResponse.json({ message: "Conecta una tienda antes de sincronizar.", ok: false }, { status: 409 });
  }

  console.info("[tiendanube-sync] api route called", {
    hasStoreId: Boolean(storeId),
    source: "/api/sync/run",
    storeId: resolvedStore.storeId,
  });

  const result = await startTiendanubeSync({
    storeId: resolvedStore.storeId,
  });

  console.info("[tiendanube-sync] api route queued sync", {
    jobId: result.jobId,
    message: result.message,
    ok: result.ok,
    status: result.status,
    storeId: resolvedStore.storeId,
    warning: "warning" in result ? result.warning ?? null : null,
  });

  const resultData = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null;
  const shouldStartBackgroundSync = result.ok && result.jobId && !resultData?.existingJobId;

  if (shouldStartBackgroundSync) {
    after(async () => {
      const finished = await runInitialSync({
        existingJobId: result.jobId,
        storeId: resolvedStore.storeId,
      });

      console.info("[tiendanube-sync] background sync finished", {
        jobId: finished.jobId,
        ok: finished.ok,
        status: finished.status,
        storeId: resolvedStore.storeId,
      });

      revalidateTag(getSidebarCacheTag(resolvedStore.storeId), "max");
      revalidateTag(getDashboardCacheTag(resolvedStore.storeId), "max");
    });
  }

  return NextResponse.json(result, { status: result.status });
}
