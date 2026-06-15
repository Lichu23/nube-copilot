import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAnalystPreferencesForActiveStore,
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

export async function GET() {
  const preferences = await getAnalystPreferencesForActiveStore();
  return NextResponse.json({ ok: true, preferences });
}

export async function PUT(request: Request) {
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Preferencias inválidas.", ok: false }, { status: 400 });
  }

  try {
    const preferences = await upsertAnalystPreferencesForActiveStore(parsed.data);
    return NextResponse.json({ ok: true, preferences });
  } catch {
    return NextResponse.json(
      { message: "Conectá una tienda antes de guardar preferencias.", ok: false },
      { status: 409 },
    );
  }
}
