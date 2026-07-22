import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAnalystResponse } from "@/lib/ai/analyst";
import { chatRequestSchema } from "@/lib/ai/schemas";
import { getActiveTiendanubeConnection, persistChatExchange, resolveActiveStoreId } from "@/lib/db/client";

function getLatestUserMessage(messages: Array<{ content: string; role: "assistant" | "user" }>) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("Se requiere un mensaje del usuario.");
  }

  return latestUserMessage;
}

function createRequestId() {
  return `chat-${crypto.randomUUID()}`;
}

function getFriendlyChatErrorMessage(message: string) {
  if (message.includes("Failed to call a function") || message.includes("failed_generation")) {
    return "No pude completar esa consulta en este intento. Probá reformularla o pedime una métrica más específica, como ventas, productos top o comparación por período.";
  }

  if (message.includes("No active Tiendanube connection")) {
    return "Primero conectá y sincronizá una tienda Tiendanube para analizar datos reales.";
  }

  if (message.includes("configured")) {
    return "El analista no está configurado correctamente. Revisá la configuración del servidor antes de volver a intentar.";
  }

  return "No pude completar la consulta. Probá de nuevo en unos segundos.";
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    const body = chatRequestSchema.parse(await request.json());
    console.info("[ai-chat] /api/chat request", {
      messageCount: body.messages.length,
      messages: body.messages.map((message, index) => ({
        contentPreview: message.content.slice(0, 160),
        index,
        role: message.role,
      })),
      requestId,
    });

    const resolvedStore = await resolveActiveStoreId(body.storeId);
    const result = await generateAnalystResponse(body.messages, {
      requestId,
      storeId: resolvedStore.storeId,
    });
    const latestUserMessage = getLatestUserMessage(body.messages);
    const activeConnection = await getActiveTiendanubeConnection(resolvedStore.storeId);

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

      console.info("[ai-chat] /api/chat persistence:success", {
        durationMs: Date.now() - startedAt,
        requestId,
        storeId: activeConnection.storeId,
        toolCallCount: result.toolResults.length,
      });
    } else {
      console.warn("[ai-chat] /api/chat persistence:skipped", {
        durationMs: Date.now() - startedAt,
        reason: "no-active-connection",
        requestId,
      });
    }

    console.info("[ai-chat] /api/chat response", {
      confidence: result.confidence,
      durationMs: Date.now() - startedAt,
      evidenceCount: result.evidence.length,
      requestId,
      toolCallCount: result.toolResults.length,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "La solicitud del chat es inválida.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Falló la solicitud del chat.";
    const userMessage = getFriendlyChatErrorMessage(message);
    const status = message.includes("configured") ? 500 : 400;

    console.error("[ai-chat] /api/chat error", {
      durationMs: Date.now() - startedAt,
      message,
      requestId,
      status,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        ok: false,
        message: userMessage,
      },
      { status },
    );
  }
}
