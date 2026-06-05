import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Manual sync route scaffolded. Implement products/orders fetch and upserts next.",
    },
    { status: 501 },
  );
}
