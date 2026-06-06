import { NextResponse } from "next/server";
import { runInitialSync } from "@/lib/tiendanube/sync";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  console.info("[tiendanube-sync] api route called", {
    hasStoreId: typeof body?.storeId === "string",
    source: "/api/sync/run",
    storeId: typeof body?.storeId === "string" ? body.storeId : null,
  });

  const result = await runInitialSync({
    storeId: typeof body?.storeId === "string" ? body.storeId : undefined,
  });

  return NextResponse.json(result, { status: result.status });
}
