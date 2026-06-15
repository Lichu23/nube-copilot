import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteSavedReportForActiveStore,
  getSavedReportsForActiveStore,
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

export async function GET() {
  const reports = await getSavedReportsForActiveStore();
  return NextResponse.json({ ok: true, reports });
}

export async function POST(request: Request) {
  const parsed = savedReportSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Reporte inválido.", ok: false }, { status: 400 });
  }

  try {
    const report = await upsertSavedReportForActiveStore(parsed.data as SavedReportRecord);
    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json(
      { message: "Conectá una tienda antes de guardar reportes.", ok: false },
      { status: 409 },
    );
  }
}

export async function DELETE(request: Request) {
  const reportId = new URL(request.url).searchParams.get("id");

  if (!reportId) {
    return NextResponse.json({ message: "Falta el reporte.", ok: false }, { status: 400 });
  }

  try {
    await deleteSavedReportForActiveStore(reportId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Conectá una tienda antes de eliminar reportes.", ok: false },
      { status: 409 },
    );
  }
}
