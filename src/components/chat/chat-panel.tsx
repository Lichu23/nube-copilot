"use client";

import {
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildCanvasModel } from "@/lib/ai/canvas-builders";
import {
  getPersonalizedPrompts,
  type AnalystPreferences,
} from "@/lib/analyst/preferences";
import { formatDateTimeLabel } from "@/lib/formatting";
import { copyReportSummary, exportReportCsv, pinReport } from "@/lib/reports/actions";
import type { AnalystResponse, ChatMessage } from "@/lib/types";
import { AnalysisCanvas } from "./analysis-canvas";
import { ReportPreviewCard } from "./report-preview-card";

type ChatPanelProps = {
  hasConnection: boolean;
  initialInput?: string;
  initialPreferences: AnalystPreferences;
  lastSyncAt: string | null;
  storeId?: string;
  storeName: string;
};

const emptyStatePrompts = [
  {
    description: "Encontrá productos quietos y capital inmovilizado.",
    icon: BarChart3,
    prompt: "¿Qué productos no se vendieron en los últimos 30 días?",
  },
  {
    description: "Definí qué conviene liquidar primero.",
    icon: Store,
    prompt: "¿Qué debería poner en promoción para liberar stock?",
  },
  {
    description: "Calculá el impacto financiero del inventario lento.",
    icon: LayoutDashboard,
    prompt: "¿Cuánto capital tengo atado en slow movers?",
  },
];

function buildPromptCards(preferences: AnalystPreferences) {
  const icons = [BarChart3, Store, LayoutDashboard];

  return getPersonalizedPrompts(preferences).map((prompt, index) => ({
    description:
      index === 0
        ? `Prioridad: ${preferences.goal.toLowerCase()}.`
        : index === 1
          ? `Foco operativo: ${preferences.friction.toLowerCase()}.`
          : `Tono ${preferences.tone.toLowerCase()} para decidir más rápido.`,
    icon: icons[index] ?? BarChart3,
    prompt,
  }));
}

function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Todavía no sincronizado";
  const formatted = formatDateTimeLabel(lastSyncAt);
  return formatted === lastSyncAt ? "Sincronizado recientemente" : `Sincronizado ${formatted}`;
}

function UnsupportedFeedbackCard({
  answer,
  onSuggestedQuestionClick,
  suggestions,
}: {
  answer: string;
  onSuggestedQuestionClick: (question: string) => void;
  suggestions: string[];
}) {
  return (
    <article className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <HelpCircle className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Pregunta fuera de alcance</p>
          <p className="mt-2 text-[1.05rem] leading-7">{answer}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSuggestedQuestionClick(question)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-left text-sm leading-5 text-amber-950 transition hover:bg-amber-100"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function buildTenantHref(path: string, storeId?: string) {
  return storeId ? `${path}?storeId=${storeId}` : path;
}

function WorkspaceSidebar({ storeId }: { storeId?: string }) {
  return (
    <aside className="hidden border-r border-border bg-card px-4 py-6 lg:flex lg:flex-col">
      <Link href={buildTenantHref("/chat", storeId)} className="flex items-center gap-3 px-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-navy !text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">NubeCopilot</span>
      </Link>

      <nav className="mt-10 space-y-1">
        <Link href={buildTenantHref("/chat", storeId)} aria-current="page" className="flex items-center gap-3 rounded-2xl bg-surface-muted px-3 py-2.5 text-sm font-medium text-foreground">
          <MessageSquare className="h-4.5 w-4.5" />
          Chat del analista
        </Link>
        <Link href={buildTenantHref("/dashboard", storeId)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <LayoutDashboard className="h-4.5 w-4.5" />
          Panel
        </Link>
        <Link href={buildTenantHref("/saved", storeId)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <Bookmark className="h-4.5 w-4.5" />
          Guardados
        </Link>
        <Link href={buildTenantHref("/settings", storeId)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <Settings2 className="h-4.5 w-4.5" />
          Ajustes
        </Link>
      </nav>

      <Link
        href={buildTenantHref("/settings", storeId)}
        className="mt-auto rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground transition hover:border-border-strong hover:text-foreground"
      >
        <span className="font-semibold text-foreground">Ajustar analista</span>
        <span className="mt-1 block">Objetivos, tono y frecuencia.</span>
      </Link>
    </aside>
  );
}

export function ChatPanel({
  hasConnection,
  initialInput = "",
  initialPreferences,
  lastSyncAt,
  storeId,
  storeName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [latestResult, setLatestResult] = useState<AnalystResponse | null>(null);
  const [latestQuestion, setLatestQuestion] = useState("");
  const [preferences] = useState(initialPreferences);
  const [actionState, setActionState] = useState<"already-pinned" | "copied" | "error" | "exported" | "idle" | "pinned">("idle");
  const [isChatVisible, setIsChatVisible] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const canvasModel = useMemo(
    () => buildCanvasModel(latestResult, latestQuestion),
    [latestQuestion, latestResult],
  );
  const lastAssistantIndex = [...messages].reverse().findIndex((message) => message.role === "assistant");
  const resolvedLastAssistantIndex =
    lastAssistantIndex === -1 ? -1 : messages.length - 1 - lastAssistantIndex;
  const lastSyncLabel = getLastSyncLabel(lastSyncAt);
  const personalizedPrompts = useMemo(() => buildPromptCards(preferences), [preferences]);
  const greetingName = preferences.name.trim() || storeName;
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

  useEffect(() => {
    if (isChatVisible) {
      window.setTimeout(() => {
        composerRef.current?.focus();
      }, 0);
    }
  }, [isChatVisible]);

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

    if (!hasConnection) {
      setError("Primero conectá y sincronizá una tienda Tiendanube para analizar datos reales.");
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
        body: JSON.stringify({ messages: nextMessages, storeId }),
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
        throw new Error(payload.ok ? "Falló la solicitud del chat." : (payload.message ?? "Falló la solicitud del chat."));
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.result.answer,
        },
      ]);
      setLatestResult(payload.result);
      if (payload.result.toolResults.length > 0) {
        setIsChatVisible(false);
      }
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Falló la solicitud del chat.";
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

  async function handleCopySummary() {
    if (!canvasModel) return;
    await copyReportSummary(canvasModel);
    setActionState("copied");
    window.setTimeout(() => setActionState("idle"), 1500);
  }

  function handleExportCsv() {
    if (!canvasModel) return;
    exportReportCsv(canvasModel);
    setActionState("exported");
    window.setTimeout(() => setActionState("idle"), 1500);
  }

  async function handlePinReport() {
    if (!canvasModel) return;

    try {
      const result = await pinReport(canvasModel, storeId);
      setActionState(result.status);
    } catch {
      setActionState("error");
    }

    window.setTimeout(() => setActionState("idle"), 1500);
  }

  async function handlePromptClick(prompt: string) {
    await submitPrompt(prompt);
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground lg:grid lg:h-screen lg:overflow-hidden lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out"
      style={{
        gridTemplateColumns: isChatVisible
          ? "244px minmax(420px,42%) minmax(0,1fr)"
          : "244px 0 minmax(0,1fr)",
      }}
    >
      <WorkspaceSidebar storeId={storeId} />

      <section
        id="chat-workspace"
        className={`flex min-h-screen flex-col border-r border-border bg-background lg:h-screen lg:overflow-hidden lg:transition-all lg:duration-300 lg:ease-out ${
          isChatVisible ? "lg:opacity-100 lg:translate-x-0" : "lg:pointer-events-none lg:opacity-0 lg:-translate-x-3"
        }`}
      >
        <header className="shrink-0 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Chat del analista</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                {storeName} · Tiendanube · {hasConnection ? "conectada" : "no conectada"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Link
                href={buildTenantHref("/dashboard", storeId)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
                aria-label="Abrir dashboard"
                title="Abrir dashboard"
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
              </Link>
              <Link
                href={buildTenantHref("/settings", storeId)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
                aria-label="Ajustar analista"
                title="Ajustar analista"
              >
                <Settings2 className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7 sm:px-6" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Personalizado para tu tienda
              </div>
              <h1 className="font-display mt-8 max-w-2xl text-[4rem] leading-[0.9] tracking-[-0.04em] text-foreground">
                Hola {greetingName}. <span className="italic text-primary">Listo cuando quieras.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {hasConnection
                  ? `Armé tu espacio alrededor de ${preferences.goal.toLowerCase()} y ${preferences.friction.toLowerCase()}. ${lastSyncLabel}.`
                  : "Primero conectá tu tienda Tiendanube. Sin datos sincronizados, el analista no debe inventar números."}
              </p>

                {!hasConnection ? (
                <Link
                  href={buildTenantHref("/connect", storeId)}
                  className="mt-6 inline-flex w-fit rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Conectar tienda
                </Link>
              ) : null}

              <div className="mt-14">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Sugerido para vos</p>
                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  {(preferences.completedAt ? personalizedPrompts : emptyStatePrompts).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.prompt}
                        type="button"
                        onClick={() => handlePromptClick(item.prompt)}
                        disabled={!hasConnection || isPending}
                        className="cursor-pointer group min-h-32 rounded-[1.35rem] border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-muted text-foreground transition group-hover:bg-accent/15 group-hover:text-accent">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="mt-4 block text-base font-semibold leading-6 text-foreground">{item.prompt}</span>
                        <span className="mt-2 block text-sm leading-5 text-muted-foreground">{item.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 pb-6">
              {messages.map((message, index) => {
                const isLastStructuredAssistant =
                  message.role === "assistant" && index === resolvedLastAssistantIndex && canvasModel;

                if (message.role === "user") {
                  return (
                    <div key={`${message.role}-${index}`} className="flex justify-end">
                      <div className="max-w-[82%] rounded-[1.45rem] bg-ink-navy px-5 py-3 text-base font-medium leading-7 text-white shadow-sm">
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
                          Respuesta lista. Tomé pedidos pagos de Tiendanube y los comparé contra la ventana elegida.
                        </p>
                      </div>
                      <ReportPreviewCard
                        model={canvasModel}
                        onCopiarSummary={handleCopySummary}
                        onExportCsv={handleExportCsv}
                        onOpenAnalysis={() => window.scrollTo({ behavior: "smooth", top: 0 })}
                        onPinReport={handlePinReport}
                        onSuggestedQuestionClick={handlePromptClick}
                      />
                    </div>
                  );
                }

                if (
                  message.role === "assistant" &&
                  index === resolvedLastAssistantIndex &&
                  latestResult &&
                  latestResult.toolResults.length === 0
                ) {
                  return (
                    <UnsupportedFeedbackCard
                      key={`${message.role}-${index}`}
                      answer={latestResult.answer}
                      onSuggestedQuestionClick={handlePromptClick}
                      suggestions={latestResult.recommendedActions}
                    />
                  );
                }

                return (
                  <div key={`${message.role}-${index}`} className="flex justify-start">
                    <div className="max-w-[85%] rounded-[1.45rem] border border-border bg-card px-4 py-3 text-base leading-7 text-foreground shadow-sm">
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

        <div className="shrink-0 border-t border-border bg-background px-4 py-4 sm:px-6">
          <form onSubmit={handleSubmit} className="surface-card mx-auto max-w-3xl rounded-[1.65rem] p-3 shadow-lg shadow-ink-navy/5">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={hasConnection ? "Preguntá sobre ventas, stock, productos o clientes..." : "Conectá tu tienda para empezar..."}
              className="min-h-20 w-full resize-none bg-transparent px-1 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground"
              disabled={isPending || !hasConnection}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasConnection ? "NubeCopilot puede equivocarse; verificá los números importantes." : "Necesitás una conexión activa para consultar datos."}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isPending || !hasConnection || !input.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Enviar pregunta"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>
          {actionState !== "idle" ? (
            <p className="mx-auto mt-2 max-w-3xl text-right text-sm text-emerald-600">
              {actionState === "copied"
                ? "Resumen copiado."
                : actionState === "exported"
                  ? "CSV exportado."
                  : actionState === "error"
                    ? "No se pudo guardar el reporte."
                    : actionState === "already-pinned"
                      ? "Este reporte ya estaba fijado."
                      : "Reporte fijado."}
            </p>
          ) : null}
        </div>
      </section>

      <aside className={`relative hidden h-screen overflow-y-auto bg-background transition-opacity duration-300 lg:block ${canvasModel || isPending ? "opacity-100" : "opacity-70"}`}>
        <button
          type="button"
          onClick={() => setIsChatVisible((visible) => !visible)}
          aria-expanded={isChatVisible}
          aria-controls="chat-workspace"
          className="absolute left-3 top-16 z-40 inline-flex max-w-max items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xl shadow-black/10 transition hover:border-border-strong hover:bg-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-navy !text-white">
            <MessageSquare className="h-4 w-4" />
          </span>
          {isChatVisible ? <ChevronLeft className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>

        <div className="flex h-14 items-center justify-between border-b border-border px-6 text-sm text-muted-foreground">
          <span>Canvas de análisis</span>
          <Link href={buildTenantHref("/dashboard", storeId)} className="inline-flex items-center gap-1.5 transition hover:text-foreground">
            Ver dashboard
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <AnalysisCanvas lastSyncLabel={lastSyncLabel} model={canvasModel} isPending={isPending} storeId={storeId} />
      </aside>
    </div>
  );
}
