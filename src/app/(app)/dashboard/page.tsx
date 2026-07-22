import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { InsightCard } from "@/components/dashboard/insight-card";
import { AnalystProfileCard } from "@/components/dashboard/analyst-profile-card";
import { DashboardRangeSelector } from "@/components/dashboard/dashboard-range-selector";
import { LowStockAlertCard } from "@/components/dashboard/low-stock-alert-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PinnedReportsPanel } from "@/components/dashboard/pinned-reports-panel";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { formatAsOfInputValue, getLatestSyncOutcome } from "@/lib/dashboard/data-transformer";
import { getCachedDashboardPayload } from "@/lib/dashboard/cache";
import {
  formatRevenueComparisonHelper,
  formatSignedNumber,
  formatSignedPercent,
} from "@/lib/dashboard/formatters";
import { getAnalystPreferencesForActiveStore, getSavedReportsForActiveStore } from "@/lib/db/client";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatting";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

function DashboardSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const isDevOverrideEnabled = process.env.NODE_ENV !== "production";
  const activeConnection = await requireActiveStore(storeId);
  const resolvedStoreId = storeId ?? activeConnection.storeId;
  const [dashboardPayload, preferences, savedReports] = await Promise.all([
    getCachedDashboardPayload({
      asOf: params.asOf,
      compareWindow: params.compareWindow,
      isDevOverrideEnabled,
      storeId: resolvedStoreId,
    }),
    getAnalystPreferencesForActiveStore(resolvedStoreId),
    getSavedReportsForActiveStore(resolvedStoreId),
  ]);
  const { compareWindow, data: dashboardData, summary } = dashboardPayload;
  const endDate = new Date(dashboardPayload.endDate);
  const asOfInputValue = formatAsOfInputValue(endDate);
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
  const latestSyncOutcome = getLatestSyncOutcome(summary);
  const {
    grossProductSales,
    lowStockAlert,
    lowStockChatHref,
    metrics,
    periodComparison,
    revenueDifference,
    snapshotCard,
    snapshotChatHref,
    topProducts,
    trend,
    windows,
  } = dashboardData;
  const { windowConfig } = windows;
  const hasReconciliationData = Boolean(summary.connection && metrics);
  const storeName = summary.connection?.storeName ?? "La Tiendita";

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">{windowConfig.label}</p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-foreground">
          {`Buen día, ${storeName}.`}
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Esto es lo que se está moviendo en tu tienda esta semana.
        </p>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Vista general de performance
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas, tendencia e inventario para decidir rápido.
          </p>
        </div>
        <Link
          href={`/chat?storeId=${resolvedStoreId}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-full btn-ink px-4 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          Preguntar al analista
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <AnalystProfileCard preferences={preferences} storeId={storeId} />

      <section className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Período
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Comparación de período
              </h2>
          </div>
          <DashboardRangeSelector
            asOfInputValue={asOfInputValue}
            compareWindow={compareWindow}
            showAsOfControl={isDevOverrideEnabled}
            storeId={resolvedStoreId}
          />
        </div>
      </section>

      <DashboardSection
        title="Resumen del período"
        description={`Indicadores principales de los últimos ${windowConfig.label}, comparados contra el período anterior.`}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            definition={metricDefinitions.netRevenue}
            helper={
              summary.connection
                ? formatRevenueComparisonHelper({
                    absoluteChange: periodComparison?.revenue.absoluteChange ?? 0,
                    currency: metrics?.currency ?? null,
                    label: windowConfig.label,
                    percentageChange:
                      periodComparison?.revenue.percentageChange ?? null,
                  })
                : "Conectá y sincronizá una tienda para ver datos reales."
            }
            icon={<TrendingUp className="h-4.5 w-4.5" />}
            label={`Facturación (${windowConfig.label})`}
            tone="positive"
            value={
              metrics
                ? formatCurrency(metrics.revenue, metrics.currency)
                : "$0.00"
            }
          />
          <MetricCard
            definition={metricDefinitions.orderCount}
            helper={
              summary.connection
                ? `${formatSignedPercent(periodComparison?.orderCount.percentageChange ?? null, windowConfig.label)} | Cambio ${formatSignedNumber(periodComparison?.orderCount.absoluteChange ?? 0)} pedidos`
                : "Esperando la conexión de la tienda."
            }
            icon={<ShoppingCart className="h-4.5 w-4.5" />}
            label={`Pedidos (${windowConfig.label})`}
            tone="positive"
            value={String(metrics?.orderCount ?? 0)}
          />
          <MetricCard
            definition={metricDefinitions.averageOrderValue}
            helper={
              summary.connection
                ? `${formatSignedPercent(periodComparison?.averageOrderValue.percentageChange ?? null, windowConfig.label)} | ${metrics?.unitsSold ?? 0} unidades`
                : "Esperando la conexión de la tienda."
            }
            icon={<PackageCheck className="h-4.5 w-4.5" />}
            label={`Ticket promedio (${windowConfig.label})`}
            tone="positive"
            value={
              metrics
                ? formatCurrency(metrics.averageOrderValue, metrics.currency)
                : "$0.00"
            }
          />
          <MetricCard
            helper={
              summary.connection
                ? "Pendiente de cohortes reales."
                : "Esperando la conexión de la tienda."
            }
            icon={<UsersRound className="h-4.5 w-4.5" />}
            label="Clientes recurrentes"
            tone="warning"
            value={summary.connection ? "—" : "0"}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Evolución e insight"
        description="La tendencia muestra movimiento diario; el insight resume qué mirar primero."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <SalesTrendChart data={trend} />
          <InsightCard
            title="Insight del analista"
            body={
              snapshotCard?.summary ??
              (latestSyncOutcome === "partial"
                ? `La última sincronización quedó parcial. ${summary.latestSyncJob?.errorMessage ?? "Revisá el detalle del job."}`
                : latestSyncStatus === "succeeded"
                  ? `La última sincronización terminó bien. ID del último job: ${summary.latestSyncJob?.id}.`
                  : latestSyncStatus === "failed"
                    ? `La última sincronización falló. ${summary.latestSyncJob?.errorMessage ?? "Revisá el detalle del job."}`
                    : summary.connection
                      ? "Los insights van a mejorar ahora que productos y pedidos están entrando en Postgres."
                      : "Conectá primero una tienda y luego sincronizá productos para empezar a construir insights.")
            }
            chatHref={snapshotChatHref}
            evidence={snapshotCard?.evidence}
            shareText={snapshotCard?.shareText}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Productos e inventario"
        description="Ranking de productos que generan ventas y señales de stock para evitar quedarte corto."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <TopProductsTable
            currency={metrics?.currency ?? null}
            helperLabel={
              summary.connection
                ? `Facturación y unidades por producto en los Últimos ${windowConfig.label} sobre ${summary.orderCount} pedidos sincronizados`
                : "Esperando la sincronización inicial"
            }
            rows={topProducts}
          />
          <LowStockAlertCard alert={lowStockAlert} chatHref={lowStockChatHref} />
        </div>
      </DashboardSection>

      <PinnedReportsPanel initialReports={savedReports} storeId={resolvedStoreId} />

      {hasReconciliationData ? (
        <section className="surface-card rounded-2xl p-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              Conciliación de facturación
            </h2>
            <p className="text-sm text-muted-foreground">
              La venta bruta por producto y la facturación neta responden
              preguntas distintas, así que pueden no coincidir exacto.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Venta bruta de productos
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(grossProductSales, metrics?.currency ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Facturación neta
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(
                  metrics?.revenue ?? 0,
                  metrics?.currency ?? null,
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Diferencia
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatSignedCurrency(
                  revenueDifference,
                  metrics?.currency ?? null,
                )}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Las diferencias suelen venir de descuentos, envíos, impuestos o
            redondeos entre el total final del pedido y la suma de líneas.
          </p>
        </section>
      ) : null}
    </main>
  );
}
