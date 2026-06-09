"use client";

import { useState } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ToolResultChart } from "@/components/chat/tool-result-chart";
import { ToolResultTable } from "@/components/chat/tool-result-table";
import type { AnalystResponse } from "@/lib/ai/analyst";
import type { ChatMessage } from "@/lib/ai/schemas";

type ToolResult = {
  input: unknown;
  output: unknown;
  toolCallId: string;
  toolName: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Ask about sales performance. I’ll answer with backend evidence, not guesses.",
  },
];

const showDebugEvidence =
  process.env.NEXT_PUBLIC_SHOW_CHAT_DEBUG_EVIDENCE === "true" || process.env.NODE_ENV !== "production";

function formatAssistantMessage(result: AnalystResponse) {
  const sections = [result.answer];

  if (result.evidence.length > 0) {
    sections.push(
      [
        "Evidence:",
        ...result.evidence.map((item) =>
          item.period ? `- ${item.metric}: ${item.value} (${item.period})` : `- ${item.metric}: ${item.value}`,
        ),
      ].join("\n"),
    );
  }

  if (result.recommendedActions.length > 0) {
    sections.push(["Recommended actions:", ...result.recommendedActions.map((action) => `- ${action}`)].join("\n"));
  }

  return sections.join("\n\n");
}

type ChatPanelProps = {
  initialInput?: string;
};

export function ChatPanel({ initialInput = "" }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [latestResult, setLatestResult] = useState<Pick<
    AnalystResponse,
    "confidence" | "evidence" | "recommendedActions"
  > | null>(null);
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isPending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmedInput }];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsPending(true);

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
        throw new Error(payload.ok ? "Chat request failed." : (payload.message ?? "Chat request failed."));
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: formatAssistantMessage(payload.result),
        },
      ]);
      setLatestResult({
        confidence: payload.result.confidence,
        evidence: payload.result.evidence,
        recommendedActions: payload.result.recommendedActions,
      });
      setToolResults(payload.result.toolResults);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Chat request failed.";
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

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
          ))}
          {isPending ? <MessageBubble role="assistant" content="Analyzing with backend evidence..." /> : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Ask for a sales summary, top products, or compare periods."
            className="min-h-28 rounded-2xl border border-black/10 px-4 py-3 text-sm text-zinc-950 outline-none ring-0 placeholder:text-zinc-400"
            disabled={isPending}
          />
          <div className="flex items-center justify-between gap-3">
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : initialInput ? (
              <p className="text-sm text-zinc-500">Prompt loaded from the dashboard snapshot. Edit it or send it as-is.</p>
            ) : (
              <p className="text-sm text-zinc-500">Evidence-first answers only.</p>
            )}
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Analyzing..." : "Ask analyst"}
            </button>
          </div>
        </form>
      </div>

      {showDebugEvidence && latestResult ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Analyst evidence</h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Confidence: {latestResult.confidence}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {latestResult.evidence.length === 0 ? (
              <p className="text-sm text-zinc-500">No evidence cards for this request.</p>
            ) : (
              latestResult.evidence.map((item, index) => (
                <article key={`${item.metric}-${index}`} className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-950">{item.metric}</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">{item.value}</p>
                  {item.period ? <p className="mt-1 text-xs text-zinc-500">{item.period}</p> : null}
                </article>
              ))
            )}
          </div>

          {latestResult.recommendedActions.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-zinc-950">Recommended actions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                {latestResult.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {showDebugEvidence ? <ToolResultChart items={toolResults} /> : null}
      {showDebugEvidence ? <ToolResultTable items={toolResults} /> : null}
    </section>
  );
}


