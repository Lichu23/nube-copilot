"use client";

import { ArrowRight, Check, LoaderCircle, PackageSearch, ShoppingBag, Store, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";

type ConnectSyncPanelProps = {
  autoRun: boolean;
  hasConnection: boolean;
  orderCount: number;
  productCount: number;
  storeId?: string;
  variantCount: number;
};

type SyncResponse = {
  message?: string;
  ok?: boolean;
};

const syncSteps = [
  {
    icon: Store,
    label: "Perfil de tienda",
    detail: "Nombre, país, moneda e idioma",
  },
  {
    icon: PackageSearch,
    label: "Productos",
    detail: "Catálogo, handles y estado de publicación",
  },
  {
    icon: PackageSearch,
    label: "Variantes e inventario",
    detail: "SKUs, precios y niveles de stock",
  },
  {
    icon: ShoppingBag,
    label: "Pedidos recientes",
    detail: "Últimos 90 días, estados y fechas",
  },
  {
    icon: ShoppingBag,
    label: "Items de pedidos",
    detail: "Cantidades, precios y totales por línea",
  },
  {
    icon: Users,
    label: "Señales de clientes",
    detail: "Contacto anonimizado antes de guardarse",
  },
];

export function ConnectSyncPanel({
  autoRun,
  hasConnection,
  orderCount,
  productCount,
  storeId,
  variantCount,
}: ConnectSyncPanelProps) {
  const { messages } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [hasSynced, setHasSynced] = useState(productCount > 0 || orderCount > 0 || variantCount > 0);
  const [feedback, setFeedback] = useState<string>(hasSynced ? messages.sync.alreadySynced : messages.sync.ready);
  const hasAutoStartedRef = useRef(false);

  const activeStep = useMemo(() => {
    if (hasSynced) return syncSteps.length;
    if (isPending) return 2;
    return hasConnection ? 1 : 0;
  }, [hasConnection, hasSynced, isPending]);

  const progress = Math.round((activeStep / syncSteps.length) * 100);
  const onboardingHref = storeId
    ? `/onboarding?storeId=${encodeURIComponent(storeId)}&flow=setup`
    : "/onboarding?flow=setup";

  const triggerSync = useCallback((options?: { auto?: boolean }) => {
    if (!hasConnection || isPending) return;

    setFeedback(options?.auto ? messages.sync.autoReading : messages.sync.reading);

    startTransition(async () => {
      try {
        const response = await fetch("/api/sync/run", {
          body: storeId ? JSON.stringify({ storeId }) : undefined,
          headers: storeId ? { "Content-Type": "application/json" } : undefined,
          method: "POST",
        });
        const payload = (await response.json()) as SyncResponse;

        if (!response.ok || !payload.ok) {
          setFeedback(payload.message ?? messages.sync.failed);
          return;
        }

        setHasSynced(true);
        setFeedback(payload.message ?? messages.sync.completed);
      } catch {
        setFeedback(messages.sync.requestFailed);
      }
    });
  }, [hasConnection, isPending, messages.sync, startTransition, storeId]);

  useEffect(() => {
    if (!autoRun || !hasConnection || hasAutoStartedRef.current || hasSynced) return;
    hasAutoStartedRef.current = true;
    triggerSync({ auto: true });
  }, [autoRun, hasConnection, hasSynced, triggerSync]);

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{activeStep} de {syncSteps.length} listo</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-card">
        {syncSteps.map((step, index) => {
          const isDone = hasSynced || index < activeStep - 1;
          const isActive = !hasSynced && isPending && index === activeStep - 1;
          const isWaiting = !isDone && !isActive;

          return (
            <div key={step.label} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
              <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] ${isWaiting ? "bg-muted text-text-muted" : "bg-accent text-accent-foreground"}`}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${isWaiting ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
              {isDone ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary"><Check className="h-4 w-4" /> Listo</span>
              ) : isActive ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary"><LoaderCircle className="h-4 w-4 animate-spin" /> Leyendo...</span>
              ) : (
                <span className="text-sm text-text-muted">En espera</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">{feedback}</p>

      <div className="mt-8 flex justify-center">
        {hasSynced ? (
          <ButtonLink href={onboardingHref} size="lg" className="shadow-card">
            Continuar onboarding
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        ) : (
          <Button
            type="button"
            onClick={() => triggerSync()}
            disabled={!hasConnection || isPending}
            size="lg"
            className="shadow-card"
          >
            {isPending ? "Leyendo tienda..." : "Leer tienda ahora"}
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </section>
  );
}

