"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatDateTimeLabel } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/i18n-context";

type SyncControlProps = {
  autoRun?: boolean;
  hasConnection: boolean;
  lastSyncFinishedAt: string | null;
  lastSyncMessage: string;
  lastSyncOutcome: string | null;
  lastSyncStatus: string | null;
  onRefreshSummary?: () => void;
  orderCount: number;
  productCount: number;
  storeId?: string;
  variantCount: number;
  variant?: "card" | "sidebar";
};

type SyncResponse = {
  message?: string;
  ok?: boolean;
  syncMode?: "initial" | "incremental";
};

export function SyncControl({
  autoRun = false,
  hasConnection,
  lastSyncFinishedAt,
  lastSyncMessage,
  lastSyncOutcome,
  lastSyncStatus,
  onRefreshSummary,
  orderCount,
  productCount,
  storeId,
  variantCount,
  variant = "card",
}: SyncControlProps) {
  const { messages } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(lastSyncMessage);
  const [localSyncRunning, setLocalSyncRunning] = useState(lastSyncStatus === "running");
  const [localSyncStartedAfter, setLocalSyncStartedAfter] = useState<string | null>(lastSyncFinishedAt);
  const hasAutoStartedRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const isLocalJobPending = localSyncRunning && lastSyncFinishedAt === localSyncStartedAfter;
  const isSyncRunning = isPending || isLocalJobPending || lastSyncStatus === "running";
  const feedbackText = isSyncRunning ? feedback : lastSyncMessage;

  const statusTone = useMemo(() => {
    if (isSyncRunning) {
      return "text-amber-600";
    }

    if (lastSyncOutcome === "partial") {
      return "text-amber-600";
    }

    if (lastSyncStatus === "succeeded") {
      return "text-emerald-600";
    }

    if (lastSyncStatus === "failed") {
      return "text-red-600";
    }

    return "text-zinc-500";
  }, [isSyncRunning, lastSyncOutcome, lastSyncStatus]);

  const triggerSync = useCallback((options?: { auto?: boolean }) => {
    if (!hasConnection) {
      return;
    }

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setFeedback(options?.auto ? messages.sync.runningInitial : messages.sync.runningIncremental);

    startTransition(async () => {
      try {
        const response = await fetch("/api/sync/run", {
          body: storeId ? JSON.stringify({ storeId }) : undefined,
          headers: storeId
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
          method: "POST",
          signal: controller.signal,
        });

        const payload = (await response.json()) as SyncResponse;
        setFeedback(payload.message ?? (payload.ok ? messages.sync.completed : messages.sync.failed));
        setLocalSyncRunning(response.status === 202 && Boolean(payload.ok));
        setLocalSyncStartedAfter(lastSyncFinishedAt);
        if (options?.auto) {
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.delete("autoSync");
          const nextQuery = nextParams.toString();
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
        }
        onRefreshSummary?.();
        router.refresh();
      } catch {
        setFeedback(controller.signal.aborted ? messages.sync.cancelled : messages.sync.requestFailed);
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
      }
    });
  }, [hasConnection, lastSyncFinishedAt, messages.sync, onRefreshSummary, pathname, router, searchParams, startTransition, storeId]);

  useEffect(() => {
    if (!isSyncRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      onRefreshSummary?.();
      router.refresh();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isSyncRunning, onRefreshSummary, router]);

  useEffect(() => {
    if (!autoRun || !hasConnection || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    triggerSync({ auto: true });
  }, [autoRun, hasConnection, triggerSync]);

  useEffect(() => {
    const abortPendingRequest = () => {
      activeRequestRef.current?.abort();
    };

    window.addEventListener("beforeunload", abortPendingRequest);

    return () => {
      window.removeEventListener("beforeunload", abortPendingRequest);
      abortPendingRequest();
    };
  }, []);

  const isSidebar = variant === "sidebar";
  const lastSyncLabel = formatDateTimeLabel(lastSyncFinishedAt);

  if (isSidebar) {
    return (
      <section className="rounded-2xl border border-border bg-background p-3">
        <div className="space-y-3 text-xs">
          <p className={statusTone}>
            {messages.sync.status}:{" "}
            <span className="font-medium">
              {isSyncRunning
                ? messages.sync.runningStatus
                : lastSyncOutcome === "partial"
                  ? messages.sync.partialStatus
                  : (lastSyncStatus ?? messages.sync.idleStatus)}
            </span>
          </p>
          <p className="text-zinc-600">
            {messages.sync.lastUpdate}:
            <span className="mt-1 block font-medium text-zinc-950">{lastSyncLabel}</span>
          </p>
          <button
            type="button"
            onClick={() => triggerSync()}
            disabled={!hasConnection || isSyncRunning}
            className="inline-flex w-full items-center justify-center rounded-xl btn-ink px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSyncRunning ? messages.sync.syncing : messages.sync.syncNow}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-zinc-500">{messages.sync.syncLabel}</p>
            <h2 className="text-lg font-semibold">{messages.sync.syncTitle}</h2>
          </div>
          <p className="text-sm text-zinc-600">
            {hasConnection
              ? autoRun && isSyncRunning
                ? messages.sync.initialDescription
                : messages.sync.incrementalDescription
              : messages.sync.connectFirst}
          </p>
          <div className="text-sm text-zinc-600">
            <p>
              {messages.sync.catalogSynced}:{" "}
              <span className="font-medium text-zinc-950">
                {messages.sync.productsAndVariants
                  .replace("{products}", String(productCount))
                  .replace("{variants}", String(variantCount))}
              </span>
            </p>
            <p>
              {messages.sync.ordersSynced}:{" "}
              <span className="font-medium text-zinc-950">
                {messages.sync.orders.replace("{orders}", String(orderCount))}
              </span>
            </p>
            <p>
              {messages.sync.lastUpdate}:{" "}
              <span className="font-medium text-zinc-950">{lastSyncLabel}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerSync()}
          disabled={!hasConnection || isSyncRunning}
          className="inline-flex items-center justify-center rounded-xl btn-ink px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSyncRunning ? messages.sync.syncing : messages.sync.syncNow}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50 px-4 py-3 text-sm">
        <p className={statusTone}>
          {messages.sync.status}:{" "}
          <span className="font-medium">
            {isSyncRunning
              ? messages.sync.runningStatus
              : lastSyncOutcome === "partial"
                ? messages.sync.partialStatus
                : (lastSyncStatus ?? messages.sync.idleStatus)}
          </span>
        </p>
        <p className="mt-1 text-zinc-600">{feedbackText}</p>
      </div>
    </section>
  );
}
