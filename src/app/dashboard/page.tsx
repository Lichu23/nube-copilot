import Link from "next/link";
import {
  ArrowUpRight,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { InsightCard } from "@/components/dashboard/insight-card";
import { AnalystProfileCard } from "@/components/dashboard/analyst-profile-card";
import { LowStockAlertCard } from "@/components/dashboard/low-stock-alert-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PinnedReportsPanel } from "@/components/dashboard/pinned-reports-panel";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { SyncControl } from "@/components/dashboard/sync-control";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { AppShell } from "@/components/layout/app-shell";
import {
  compareWindowConfig,
  type CompareWindowKey,
} from "@/lib/dashboard/config";
import {
  buildDashboardHref,
  formatAsOfInputValue,
  getCompareWindow,
  getDashboardData,
  getLatestSyncMessage,
  getLatestSyncOutcome,
  parseAsOfDate,
} from "@/lib/dashboard/data-transformer";
import {
  formatRevenueComparisonHelper,
  formatSignedNumber,
  formatSignedPercent,
} from "@/lib/dashboard/formatters";
import { getAnalystPreferencesForActiveStore, getDashboardSyncSummary, getSavedReportsForActiveStore } from "@/lib/db/client";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatting";
import { metricDefinitions } from "@/lib/metrics/definitions";
import { requireActiveStore } from "@/lib/routing/require-active-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const autoSync =
    typeof params.autoSync === "string" && params.autoSync === "1";
  const compareWindow = getCompareWindow(params.compareWindow);
  const isDevOverrideEnabled = process.env.NODE_ENV !== "production";
  const asOfOverride = isDevOverrideEnabled ? parseAsOfDate(params.asOf) : null;
  const endDate = asOfOverride ?? new Date();
  const asOfInputValue = formatAsOfInputValue(endDate);
  const activeConnection = await requireActiveStore(storeId);
  const resolvedStoreId = storeId ?? activeConnection.storeId;
  const [summary, preferences, savedReports] = await Promise.all([
    getDashboardSyncSummary(resolvedStoreId),
    getAnalystPreferencesForActiveStore(resolvedStoreId),
    getSavedReportsForActiveStore(resolvedStoreId),
  ]);
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
  const latestSyncOutcome = getLatestSyncOutcome(summary);
  const latestSyncMessage = getLatestSyncMessage(summary);
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
  } = await getDashboardData({ compareWindow, endDate, summary });
  const { windowConfig } = windows;
  const hasReconciliationData = Boolean(summary.connection && metrics);
  const storeName = summary.connection?.storeName ?? "La Tiendita";

  return (
    <AppShell
      active="dashboard"
      eyebrow={windowConfig.label}
      title={`Buen dÃ­a, ${storeName}.`}
      description="Esto es lo que se estÃ¡ moviendo en tu tienda esta semana."
      storeId={resolvedStoreId}
      meta={
        <>
          {storeName}{" "}
          <span className="text-muted-foreground">
            Â· Tiendanube Â· conectada
          </span>
        </>
      }
    >
      <div className="flex items-center justify-end">
        <Link
          href={`/chat?storeId=${resolvedStoreId}`}
          className="inline-flex items-center gap-2 rounded-full btn-ink px-4 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          Preguntar al analista
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <AnalystProfileCard preferences={preferences} storeId={storeId} />

      {isDevOverrideEnabled ? (
        <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Modo desarrollo
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  ComparaciÃ³n de perÃ­odo
                </h2>
              </div>
              <form
                action="/dashboard"
                method="get"
                className="flex flex-wrap items-end gap-2"
              >
                {storeId ? <input type="hidden" name="storeId" value={storeId} /> : null}
                <input
                  type="hidden"
                  name="compareWindow"
                  value={compareWindow}
                />
                <input type="hidden" name="storeId" value={resolvedStoreId} />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Fecha de corte
                  <input
                    name="asOf"
                    type="date"
                    defaultValue={asOfInputValue}
                    className="h-10 rounded-full border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-full btn-ink px-4 text-sm font-semibold transition"
                >
                  Aplicar
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(compareWindowConfig) as Array<
                  [
                    CompareWindowKey,
                    (typeof compareWindowConfig)[CompareWindowKey],
                  ]
                >
              ).map(([key, config]) => (
                  <Link
                  key={key}
                  href={buildDashboardHref(
                    key,
                    asOfOverride ? asOfInputValue : null,
                    resolvedStoreId,
                  )}
                  aria-current={compareWindow === key ? "page" : undefined}
                  className={`inline-flex h-10 min-w-28 items-center justify-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition ${
                    compareWindow === key
                      ? "bg-ink-navy !text-white shadow-sm"
                      : "border border-border bg-white text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {config.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              : "Conecta y sincroniza una tienda para ver datos reales."
          }
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          label={`Revenue (${windowConfig.label})`}
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
              ? `${formatSignedPercent(periodComparison?.orderCount.percentageChange ?? null, windowConfig.label)} Â· Î” ${formatSignedNumber(periodComparison?.orderCount.absoluteChange ?? 0)} pedidos`
              : "Esperando la conexiÃ³n de la tienda."
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
              ? `${formatSignedPercent(periodComparison?.averageOrderValue.percentageChange ?? null, windowConfig.label)} Â· ${metrics?.unitsSold ?? 0} unidades`
              : "Esperando la conexiÃ³n de la tienda."
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
              : "Esperando la conexiÃ³n de la tienda."
          }
          icon={<UsersRound className="h-4.5 w-4.5" />}
          label="Clientes recurrentes"
          tone="warning"
          value={summary.connection ? "â€”" : "0"}
        />
      </section>

      <SyncControl
        autoRun={autoSync}
        hasConnection={Boolean(summary.connection)}
        lastSyncFinishedAt={
          summary.latestSyncJob?.finishedAt?.toISOString() ?? null
        }
        lastSyncMessage={latestSyncMessage}
        lastSyncOutcome={latestSyncOutcome}
        lastSyncStatus={latestSyncStatus}
        orderCount={summary.orderCount}
        productCount={summary.productCount}
        storeId={summary.connection?.storeId}
        variantCount={summary.variantCount}
      />

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TopProductsTable
          currency={metrics?.currency ?? null}
          helperLabel={
            summary.connection
              ? `FacturaciÃ³n y unidades por producto en los Ãºltimos ${windowConfig.label} sobre ${summary.orderCount} pedidos sincronizados`
              : "Esperando la sincronizaciÃ³n inicial"
          }
          rows={topProducts}
        />
        <LowStockAlertCard alert={lowStockAlert} chatHref={lowStockChatHref} />
      </section>

      <PinnedReportsPanel initialReports={savedReports} storeId={resolvedStoreId} />

      {hasReconciliationData ? (
        <section className="surface-card rounded-2xl p-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              ConciliaciÃ³n de facturaciÃ³n
            </h2>
            <p className="text-sm text-muted-foreground">
              La venta bruta por producto y la facturaciÃ³n neta responden
              preguntas distintas, asÃ­ que pueden no coincidir exacto.
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
                FacturaciÃ³n neta
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
            Las diferencias suelen venir de descuentos, envÃ­os, impuestos o
            redondeos entre el total final del pedido y la suma de lÃ­neas.
          </p>
        </section>
      ) : null}
    </AppShell>
  );
}
