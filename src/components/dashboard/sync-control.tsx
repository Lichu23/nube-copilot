"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatDateTimeLabel } from "@/lib/formatting";

type SyncControlProps = {
  autoRun?: boolean;
  hasConnection: boolean;
  lastSyncFinishedAt: string | null;
  lastSyncMessage: string;
  lastSyncStatus: string | null;
  orderCount: number;
  productCount: number;
  storeId?: string;
  variantCount: number;
};

type SyncResponse = {
  message?: string;
  ok?: boolean;
};

export function SyncControl({
  autoRun = false,
  hasConnection,
  lastSyncFinishedAt,
  lastSyncMessage,
  lastSyncStatus,
  orderCount,
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

    setFeedback(options?.auto ? "Conectamos tu tienda. Estamos corriendo la primera sincronizacion..." : "Corriendo sincronizacion...");

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
        setFeedback(payload.message ?? (payload.ok ? "Sincronizacion completada." : "La sincronizacion fallo."));
        if (options?.auto) {
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.delete("autoSync");
          const nextQuery = nextParams.toString();
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
        }
        router.refresh();
      } catch {
        setFeedback("La solicitud de sincronizacion fallo antes de llegar al servidor.");
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
            <p className="text-sm font-medium text-zinc-500">Sincronizacion de catalogo</p>
            <h2 className="text-lg font-semibold">Traer productos desde Tiendanube</h2>
          </div>
          <p className="text-sm text-zinc-600">
            {hasConnection
              ? autoRun && isPending
                ? "Tu tienda se conecto bien. Estamos sincronizando la primera importacion de catalogo automaticamente."
                : "Corre la sincronizacion inicial despues de agregar productos en tu tienda conectada."
              : "Conecta primero una tienda Tiendanube para habilitar la sincronizacion."}
          </p>
          <div className="text-sm text-zinc-600">
            <p>
              Catalogo sincronizado: <span className="font-medium text-zinc-950">{productCount}</span> productos y{" "}
              <span className="font-medium text-zinc-950">{variantCount}</span> variantes
            </p>
            <p>
              Pedidos sincronizados: <span className="font-medium text-zinc-950">{orderCount}</span> pedidos
            </p>
            <p>
              Ultima sincronizacion completada:{" "}
              <span className="font-medium text-zinc-950">{formatDateTimeLabel(lastSyncFinishedAt)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerSync()}
          disabled={!hasConnection || isPending}
          className="inline-flex items-center justify-center rounded-xl btn-ink px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Sincronizando..." : "Sincronizar ahora"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50 px-4 py-3 text-sm">
        <p className={statusTone}>
          Estado: <span className="font-medium">{isPending ? "corriendo" : (lastSyncStatus ?? "idle")}</span>
        </p>
        <p className="mt-1 text-zinc-600">{feedback}</p>
      </div>
    </section>
  );
}
