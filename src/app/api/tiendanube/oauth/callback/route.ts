import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: "OAuth callback route scaffolded. Implement code exchange and token persistence next.",
    },
    { status: 501 },
  );
}
