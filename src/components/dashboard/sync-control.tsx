"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

type SyncControlProps = {
  autoRun?: boolean;
  hasConnection: boolean;
  lastSyncFinishedAt: string | null;
  lastSyncMessage: string;
  lastSyncStatus: string | null;
  productCount: number;
  storeId?: string;
  variantCount: number;
};

type SyncResponse = {
  message?: string;
  ok?: boolean;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SyncControl({
  autoRun = false,
  hasConnection,
  lastSyncFinishedAt,
  lastSyncMessage,
  lastSyncStatus,
  productCount,
  storeId,
  variantCount,
}: SyncControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(lastSyncMessage);
  const hasAutoStartedRef = useRef(false);

  const statusTone = useMemo(() => {
    if (isPending) {
      return "text-amber-600";
    }

    if (lastSyncStatus === "succeeded") {
      return "text-emerald-600";
    }

    if (lastSyncStatus === "failed") {
      return "text-red-600";
    }

    return "text-zinc-500";
  }, [isPending, lastSyncStatus]);

  const triggerSync = useCallback((options?: { auto?: boolean }) => {
    if (!hasConnection) {
      return;
    }

    setFeedback(options?.auto ? "We connected your store. Running the first sync now..." : "Running sync...");

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
        });

        const payload = (await response.json()) as SyncResponse;
        setFeedback(payload.message ?? (payload.ok ? "Sync completed." : "Sync failed."));
        if (options?.auto) {
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.delete("autoSync");
          const nextQuery = nextParams.toString();
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
        }
        router.refresh();
      } catch {
        setFeedback("Sync request failed before reaching the server.");
      }
    });
  }, [hasConnection, pathname, router, searchParams, startTransition, storeId]);

  useEffect(() => {
    if (!autoRun || !hasConnection || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    triggerSync({ auto: true });
  }, [autoRun, hasConnection, triggerSync]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-zinc-500">Catalog sync</p>
            <h2 className="text-lg font-semibold">Pull products from Tiendanube</h2>
          </div>
          <p className="text-sm text-zinc-600">
            {hasConnection
              ? autoRun && isPending
                ? "Your store was connected successfully. We are syncing the first catalog import automatically."
                : "Run the initial sync after adding products in your connected store."
              : "Connect a Tiendanube store first to enable syncing."}
          </p>
          <div className="text-sm text-zinc-600">
            <p>
              Synced catalog: <span className="font-medium text-zinc-950">{productCount}</span> products and{" "}
              <span className="font-medium text-zinc-950">{variantCount}</span> variants
            </p>
            <p>
              Last completed sync:{" "}
              <span className="font-medium text-zinc-950">{formatTimestamp(lastSyncFinishedAt)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerSync()}
          disabled={!hasConnection || isPending}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Syncing..." : "Sync now"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50 px-4 py-3 text-sm">
        <p className={statusTone}>
          Status: <span className="font-medium">{isPending ? "running" : (lastSyncStatus ?? "idle")}</span>
        </p>
        <p className="mt-1 text-zinc-600">{feedback}</p>
      </div>
    </section>
  );
}
