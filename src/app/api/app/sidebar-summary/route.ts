import { NextResponse } from "next/server";

import { getCachedDashboardSyncSummary } from "@/lib/dashboard/cache";
import { getLatestSyncMessage, getLatestSyncOutcome } from "@/lib/dashboard/data-transformer";
import { resolveActiveStoreId } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedStoreId = searchParams.get("storeId") ?? undefined;

  try {
    const { storeId } = await resolveActiveStoreId(requestedStoreId);
    const summary = await getCachedDashboardSyncSummary(storeId);

    return NextResponse.json({
      connection: summary.connection,
      latestSyncFinishedAt: summary.latestSyncJob?.finishedAt?.toISOString() ?? null,
      latestSyncMessage: getLatestSyncMessage(summary),
      latestSyncOutcome: getLatestSyncOutcome(summary),
      latestSyncStatus: summary.latestSyncJob?.status ?? null,
      orderCount: summary.orderCount,
      productCount: summary.productCount,
      storeId,
      storeName: summary.connection?.storeName ?? "Conecta tu tienda",
      variantCount: summary.variantCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo resolver el resumen del sidebar.";
    const status = message.includes("signed in") ? 401 : 403;

    return NextResponse.json({ error: message }, { status });
  }
}
