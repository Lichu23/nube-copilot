"use client";

import { ArrowUp, LayoutGrid, Settings2, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildCanvasModel } from "@/lib/ai/canvas-builders";
import { formatDateTimeLabel } from "@/lib/formatting";
import type { AnalystResponse, ChatMessage } from "@/lib/types";
import { AnalysisCanvas } from "./analysis-canvas";
import { ReportPreviewCard } from "./report-preview-card";

type ChatPanelProps = {
  hasConnection: boolean;
  initialInput?: string;
  lastSyncAt: string | null;
  storeName: string;
};

const emptyStatePrompts = [
  {
    label: "Ventas",
    prompt: "Como se comparan los ingresos contra la semana pasada?",
    tone: "text-sky-700",
  },
  {
    label: "Inventario",
    prompt: "Que SKUs se quedan sin stock en 14 dias?",
    tone: "text-orange-600",
  },
  {
    label: "Resumen semanal",
    prompt: "Dame el resumen de performance de la ultima semana",
    tone: "text-emerald-600",
  },
];

function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Todavía no sincronizado";
  const formatted = formatDateTimeLabel(lastSyncAt);
  return formatted === lastSyncAt ? "Sincronizado recientemente" : `Sincronizado ${formatted}`;
}

export function ChatPanel({
  hasConnection,
  initialInput = "",
  lastSyncAt,
  storeName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [latestResult, setLatestResult] = useState<AnalystResponse | null>(null);
  const [latestQuestion, setLatestQuestion] = useState("");
  const [copyState, setCopyState] = useState<"done" | "idle">("idle");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const canvasModel = useMemo(
    () => buildCanvasModel(latestResult, latestQuestion),
    [latestQuestion, latestResult],
  );
  const lastAssistantIndex = [...messages].reverse().findIndex((message) => message.role === "assistant");
  const resolvedLastAssistantIndex =
    lastAssistantIndex === -1 ? -1 : messages.length - 1 - lastAssistantIndex;
  const lastSyncLabel = getLastSyncLabel(lastSyncAt);

  // Scroll to bottom when messages or pending state changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          behavior: "smooth",
          top: messagesContainerRef.current?.scrollHeight ?? 0,
        });
      }, 0);
    }
  }, [messages, isPending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isPending) {
      return;
    }

    await submitPrompt(trimmedInput);
  }

  async function submitPrompt(trimmedInput: string) {
    if (!trimmedInput || isPending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmedInput }];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsPending(true);
    setLatestQuestion(trimmedInput);

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({ messages: nextMessages }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            result: AnalystResponse;
          }
        | {
            message?: string;
            ok: false;
          };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Fallo la solicitud del chat." : (payload.message ?? "Fallo la solicitud del chat."));
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.result.answer,
        },
      ]);
      setLatestResult(payload.result);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Fallo la solicitud del chat.";
      setError(message);
      setMessages((current) =>
        current.filter(
          (message, index) =>
            !(index === current.length - 1 && message.role === "user" && message.content === trimmedInput),
        ),
      );
      setInput(trimmedInput);
    } finally {
      setIsPending(false);
    }
  }

  async function handleCopiarSummary() {
    if (!canvasModel) {
      return;
    }

    await navigator.clipboard.writeText(`${canvasModel.title}\n\n${canvasModel.summary}`);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handlePromptClick(prompt: string) {
    await submitPrompt(prompt);
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[minmax(360px,38%)_minmax(0,1fr)] lg:overflow-hidden">
      <section className="flex min-h-screen flex-col border-r border-border bg-card lg:h-screen lg:overflow-hidden">
        <header className="shrink-0 flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[1.85rem] font-semibold tracking-[-0.03em] text-foreground">Analista IA de Negocio</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                {storeName} · Tiendanube
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
              aria-label="Open dashboard"
              title="Open dashboard"
            >
              <LayoutGrid className="h-4.5 w-4.5" />
            </Link>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-between gap-10">
              <div className="max-w-xl pt-8">
           
                                <h1 className="max-w-md text-[3.35rem] font-semibold leading-[0.95] tracking-[-0.05em] text-foreground">
                  Hola, preguntame sobre tu tienda.
                </h1>
                <p className="mt-4 text-[1rem] text-muted-foreground">
                  {hasConnection ? `${lastSyncLabel}.` : "Primero conectá tu tienda Tiendanube."}
                </p>
              </div>

              <div className="max-w-xl space-y-4 pb-2">
                {emptyStatePrompts.map((item) => (
                  <div key={item.prompt}>
                    <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${item.tone}`}>{item.label}</p>
                    <button
                      type="button"
                      onClick={() => handlePromptClick(item.prompt)}
                      className="mt-3 flex w-full cursor-pointer items-center rounded-[1.35rem] border border-border-strong bg-card px-5 py-4 text-left text-[1.05rem] text-foreground shadow-sm transition hover:border-accent hover:bg-muted"
                    >
                      {item.prompt}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) => {
                const isLastStructuredAssistant =
                  message.role === "assistant" && index === resolvedLastAssistantIndex && canvasModel;

                if (message.role === "user") {
                  return (
                    <div key={`${message.role}-${index}`} className="flex justify-end">
                      <div className="max-w-[82%] rounded-[1.45rem] bg-primary px-5 py-3 text-xl font-medium text-primary-foreground">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                if (isLastStructuredAssistant && canvasModel) {
                  return (
                    <div key={`${message.role}-${index}`} className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                          <Sparkles className="h-4 w-4 text-accent" />
                        </div>
                        <p className="max-w-lg text-[1.05rem] leading-8 text-foreground">
                          Esto es lo que encontré. Tomé pedidos pagos de Tiendanube y los comparé contra la ventana anterior.
                        </p>
                      </div>
                      <ReportPreviewCard
                        model={canvasModel}
                        onCopiarSummary={handleCopiarSummary}
                        onOpenAnalysis={() => window.scrollTo({ behavior: "smooth", top: 0 })}
                      />
                    </div>
                  );
                }

                return (
                  <div key={`${message.role}-${index}`} className="flex justify-start">
                    <div className="max-w-[85%] rounded-[1.45rem] border border-border bg-muted px-4 py-3 text-base leading-7 text-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {isPending ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-[1.05rem] leading-8 text-muted-foreground">
                      Analizando datos sincronizados de la tienda...
                    </p>
                  </div>
                  <div className="surface-card rounded-[1.75rem] p-5">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 w-40 rounded-full bg-muted" />
                      <div className="h-10 w-3/4 rounded-2xl bg-muted" />
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, itemIndex) => (
                          <div key={itemIndex} className="h-28 rounded-[1.25rem] bg-muted" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-5">
          <form onSubmit={handleSubmit} className="surface-card rounded-[1.65rem] p-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Preguntá lo que quieras sobre tu tienda..."
              className="min-h-28 w-full resize-none bg-transparent text-[1.18rem] leading-8 text-foreground outline-none placeholder:text-muted-foreground"
              disabled={isPending}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">↵ to send · ⇧↵ for new line</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>
          {copyState === "done" ? <p className="mt-2 text-right text-sm text-emerald-600">Resumen copiado.</p> : null}
        </div>
      </section>

      <aside className={`hidden h-screen overflow-y-auto bg-background transition-opacity duration-300 lg:block ${canvasModel || isPending ? "opacity-100" : "opacity-60"}`}>
        <AnalysisCanvas lastSyncLabel={lastSyncLabel} model={canvasModel} isPending={isPending} />
      </aside>
    </div>
  );
}
