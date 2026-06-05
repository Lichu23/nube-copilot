import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Webhook route scaffolded. Keep this for incremental sync after the MVP manual sync works.",
    },
    { status: 501 },
  );
}
