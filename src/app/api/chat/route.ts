import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAnalystResponse } from "@/lib/ai/analyst";
import { chatRequestSchema } from "@/lib/ai/schemas";
import { getActiveTiendanubeConnection, persistChatExchange } from "@/lib/db/client";

function getLatestUserMessage(messages: Array<{ content: string; role: "assistant" | "user" }>) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("A user message is required.");
  }

  return latestUserMessage;
}

export async function POST(request: Request) {
  try {
    const body = chatRequestSchema.parse(await request.json());
    console.info("[ai-chat] /api/chat request", {
      messageCount: body.messages.length,
      messages: body.messages.map((message, index) => ({
        contentPreview: message.content.slice(0, 160),
        index,
        role: message.role,
      })),
    });

    const result = await generateAnalystResponse(body.messages);
    const latestUserMessage = getLatestUserMessage(body.messages);
    const activeConnection = await getActiveTiendanubeConnection();

    if (activeConnection) {
      await persistChatExchange({
        assistantMessage: {
          content: result.answer,
          structuredPayload: result,
        },
        storeId: activeConnection.storeId,
        toolCalls: result.toolResults.map((toolResult) => ({
          arguments: toolResult.input,
          resultSummary: toolResult.output,
          toolName: toolResult.toolName,
        })),
        userMessage: {
          content: latestUserMessage.content,
          structuredPayload: {
            messageCount: body.messages.length,
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid chat payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Chat request failed.";
    const status = message.includes("configured") ? 500 : 400;

    console.error("[ai-chat] /api/chat error", {
      message,
      status,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
