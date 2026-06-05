import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Chat route scaffolded. Implement Groq + tool calling after metrics are ready.",
    },
    { status: 501 },
  );
}
