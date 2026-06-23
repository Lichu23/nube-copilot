import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteSavedReportForActiveStore,
  getSavedReportsForActiveStore,
  resolveActiveStoreId,
  upsertSavedReportForActiveStore,
  type SavedReportRecord,
} from "@/lib/db/client";

const savedReportSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().min(1),
  model: z.unknown().optional(),
  question: z.string().min(1),
  summary: z.string().min(1),
  title: z.string().min(1),
  windowLabel: z.string().min(1),
});

function getStoreIdFromUrl(request: Request) {
  const storeId = new URL(request.url).searchParams.get("storeId");
  return storeId && storeId.length > 0 ? storeId : undefined;
}

export async function GET(request: Request) {
  const storeId = getStoreIdFromUrl(request);
  const resolvedStore = await resolveActiveStoreId(storeId);
  const reports = await getSavedReportsForActiveStore(resolvedStore.storeId);
  return NextResponse.json({ ok: true, reports });
}

export async function POST(request: Request) {
  const parsed = savedReportSchema.safeParse(await request.json().catch(() => null));
  const storeId = getStoreIdFromUrl(request);

  if (!parsed.success) {
    return NextResponse.json({ message: "Reporte invalido.", ok: false }, { status: 400 });
  }

  try {
    const resolvedStore = await resolveActiveStoreId(storeId);
    const report = await upsertSavedReportForActiveStore(parsed.data as SavedReportRecord, resolvedStore.storeId);
    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json(
      { message: "Conecta una tienda antes de guardar reportes.", ok: false },
      { status: 409 },
    );
  }
}

export async function DELETE(request: Request) {
  const storeId = getStoreIdFromUrl(request);
  const reportId = new URL(request.url).searchParams.get("id");

  if (!reportId) {
    return NextResponse.json({ message: "Falta el reporte.", ok: false }, { status: 400 });
  }

  try {
    const resolvedStore = await resolveActiveStoreId(storeId);
    await deleteSavedReportForActiveStore(reportId, resolvedStore.storeId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Conecta una tienda antes de eliminar reportes.", ok: false },
      { status: 409 },
    );
  }
}
