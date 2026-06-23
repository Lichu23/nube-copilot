import { NextResponse } from "next/server";
import { getActiveTiendanubeConnection, resolveActiveStoreId } from "@/lib/db/client";
import { runInitialSync } from "@/lib/tiendanube/sync";

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

  const result = await runInitialSync({
    storeId: resolvedStore.storeId,
  });

  return NextResponse.json(result, { status: result.status });
}
