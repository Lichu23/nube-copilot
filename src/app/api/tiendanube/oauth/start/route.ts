import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: "OAuth start route scaffolded. Implement state generation and redirect next.",
    },
    { status: 501 },
  );
}
