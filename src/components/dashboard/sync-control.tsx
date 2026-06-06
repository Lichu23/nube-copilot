"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type SyncControlProps = {
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
  hasConnection,
  lastSyncFinishedAt,
  lastSyncMessage,
  lastSyncStatus,
  productCount,
  storeId,
  variantCount,
}: SyncControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(lastSyncMessage);

  const statusTone = useMemo(() => {
    if (lastSyncStatus === "succeeded") {
      return "text-emerald-600";
    }

    if (lastSyncStatus === "failed") {
      return "text-red-600";
    }

    return "text-zinc-500";
  }, [lastSyncStatus]);

  const handleSync = () => {
    if (!hasConnection) {
      return;
    }

    setFeedback("Running sync...");

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
        router.refresh();
      } catch {
        setFeedback("Sync request failed before reaching the server.");
      }
    });
  };

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
              ? "Run the initial sync after adding products in your connected store."
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
          onClick={handleSync}
          disabled={!hasConnection || isPending}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Syncing..." : "Sync now"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50 px-4 py-3 text-sm">
        <p className={statusTone}>
          Status: <span className="font-medium">{lastSyncStatus ?? "idle"}</span>
        </p>
        <p className="mt-1 text-zinc-600">{feedback}</p>
      </div>
    </section>
  );
}
