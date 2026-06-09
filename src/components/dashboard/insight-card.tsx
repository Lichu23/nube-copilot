"use client";

import Link from "next/link";
import { useState } from "react";

type InsightCardProps = {
  title: string;
  body: string;
  chatHref?: string;
  evidence?: Array<{ label: string; value: string }>;
  shareText?: string;
};

export function InsightCard({ title, body, chatHref, evidence = [], shareText }: InsightCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  async function handleCopy() {
    if (!shareText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("done");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{body}</p>

      {evidence.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {evidence.map((item) => (
            <span
              key={`${item.label}-${item.value}`}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}

      {shareText || chatHref ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {shareText ? (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              {copyState === "done" ? "Copied summary" : copyState === "error" ? "Copy failed" : "Copy summary"}
            </button>
          ) : null}

          {chatHref ? (
            <Link
              href={chatHref}
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
            >
              Ask AI about this week
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
