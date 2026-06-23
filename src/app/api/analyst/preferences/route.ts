import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAnalystPreferencesForActiveStore,
  resolveActiveStoreId,
  upsertAnalystPreferencesForActiveStore,
} from "@/lib/db/client";

const preferencesSchema = z.object({
  cadence: z.string().min(1),
  category: z.string().min(1),
  completedAt: z.string().datetime().optional(),
  friction: z.string().min(1),
  goal: z.string().min(1),
  name: z.string(),
  role: z.string().min(1),
  stage: z.string().min(1),
  tone: z.string().min(1),
  volume: z.string().min(1),
});

function getStoreIdFromUrl(request: Request) {
  const storeId = new URL(request.url).searchParams.get("storeId");
  return storeId && storeId.length > 0 ? storeId : undefined;
}

export async function GET(request: Request) {
  const storeId = getStoreIdFromUrl(request);
  const resolvedStore = await resolveActiveStoreId(storeId);
  const preferences = await getAnalystPreferencesForActiveStore(resolvedStore.storeId);
  return NextResponse.json({ ok: true, preferences });
}

export async function PUT(request: Request) {
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  const storeId = getStoreIdFromUrl(request);

  if (!parsed.success) {
    return NextResponse.json({ message: "Preferencias invalidas.", ok: false }, { status: 400 });
  }

  try {
    const resolvedStore = await resolveActiveStoreId(storeId);
    const preferences = await upsertAnalystPreferencesForActiveStore(parsed.data, resolvedStore.storeId);
    return NextResponse.json({ ok: true, preferences });
  } catch {
    return NextResponse.json(
      { message: "Conecta una tienda antes de guardar preferencias.", ok: false },
      { status: 409 },
    );
  }
}
