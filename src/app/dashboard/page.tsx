import Link from "next/link";
import { InsightCard } from "@/components/dashboard/insight-card";
import { LowStockAlertCard } from "@/components/dashboard/low-stock-alert-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PinnedReportsPanel } from "@/components/dashboard/pinned-reports-panel";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { SyncControl } from "@/components/dashboard/sync-control";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { AppShell } from "@/components/layout/app-shell";
import { compareWindowConfig, type CompareWindowKey } from "@/lib/dashboard/config";
import {
  buildDashboardHref,
  formatAsOfInputValue,
  getCompareWindow,
  getDashboardData,
  getLatestSyncMessage,
  parseAsOfDate,
} from "@/lib/dashboard/data-transformer";
import { formatRevenueComparisonHelper, formatSignedNumber, formatSignedPercent } from "@/lib/dashboard/formatters";
import { getDashboardSyncSummary } from "@/lib/db/client";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatting";
import { metricDefinitions } from "@/lib/metrics/definitions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const autoSync = typeof params.autoSync === "string" && params.autoSync === "1";
  const compareWindow = getCompareWindow(params.compareWindow);
  const isDevOverrideEnabled = process.env.NODE_ENV !== "production";
  const asOfOverride = isDevOverrideEnabled ? parseAsOfDate(params.asOf) : null;
  const endDate = asOfOverride ?? new Date();
  const asOfInputValue = formatAsOfInputValue(endDate);
  const summary = await getDashboardSyncSummary();
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
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

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Capa de confianza del analista IA"
      description="El dashboard existe para que la tienda pueda verificar los numeros detras de cada recomendacion."
    >
      {isDevOverrideEnabled ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Override de comparacion para desarrollo</h2>
                <p className="text-sm text-zinc-600">
                  Usa ventanas mas cortas y una fecha de corte para probar comparaciones entre periodos sin crear ventas manuales en Tiendanube.
                </p>
              </div>
              <div className="flex gap-2">
                {(Object.entries(compareWindowConfig) as Array<[CompareWindowKey, (typeof compareWindowConfig)[CompareWindowKey]]>).map(
                  ([key, config]) => (
                    <Link
                      key={key}
                      href={buildDashboardHref(key, asOfOverride ? asOfInputValue : null)}
                      aria-current={compareWindow === key ? "page" : undefined}
                      className={`inline-flex min-w-[8rem] items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                        compareWindow === key
                          ? "bg-zinc-950 !text-white shadow-sm"
                          : "bg-white text-zinc-700 hover:text-zinc-950"
                      }`}
                    >
                      {config.title}
                    </Link>
                  ),
                )}
              </div>
            </div>

            <form action="/dashboard" method="get" className="flex flex-col gap-3 md:flex-row md:items-end">
              <input type="hidden" name="compareWindow" value={compareWindow} />
              <label className="flex flex-col gap-1 text-sm text-zinc-700">
                <span className="font-medium">Fecha de corte</span>
                <input
                  name="asOf"
                  type="date"
                  defaultValue={asOfInputValue}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-950"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Aplicar fecha
                </button>
                <Link
                  href={buildDashboardHref(compareWindow, null)}
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
                >
                  Usar hoy real
                </Link>
              </div>
            </form>

            <p className="text-xs text-zinc-600">
              Fecha de corte efectiva: <span className="font-medium">{asOfInputValue}</span>
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          definition={metricDefinitions.netRevenue}
          label={`Facturacion neta (${windowConfig.label})`}
          value={metrics ? formatCurrency(metrics.revenue, metrics.currency) : "$0.00"}
          helper={
            summary.connection
              ? formatRevenueComparisonHelper({
                  absoluteChange: periodComparison?.revenue.absoluteChange ?? 0,
                  currency: metrics?.currency ?? null,
                  label: windowConfig.label,
                  percentageChange: periodComparison?.revenue.percentageChange ?? null,
                })
              : "Conecta y sincroniza una tienda para ver datos reales."
          }
        />
        <MetricCard
          definition={metricDefinitions.orderCount}
          label={`Pedidos (${windowConfig.label})`}
          value={String(metrics?.orderCount ?? 0)}
          helper={
            summary.connection
              ? `${formatSignedPercent(periodComparison?.orderCount.percentageChange ?? null, windowConfig.label)} - Δ ${formatSignedNumber(periodComparison?.orderCount.absoluteChange ?? 0)} pedidos`
              : "Esperando la conexion de la tienda."
          }
        />
        <MetricCard
          definition={metricDefinitions.averageOrderValue}
          label={`Ticket promedio (${windowConfig.label})`}
          value={metrics ? formatCurrency(metrics.averageOrderValue, metrics.currency) : "$0.00"}
          helper={
            summary.connection
              ? `${formatSignedPercent(periodComparison?.averageOrderValue.percentageChange ?? null, windowConfig.label)} - Unidades vendidas: ${metrics?.unitsSold ?? 0}`
              : "Esperando la conexion de la tienda."
          }
        />
      </section>

      {hasReconciliationData ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Conciliacion de facturacion</h2>
            <p className="text-sm text-zinc-600">
              La venta bruta por producto y la facturacion neta responden preguntas distintas, asi que pueden no coincidir exacto.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Venta bruta de productos</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(grossProductSales, metrics?.currency ?? null)}</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Facturacion neta</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(metrics?.revenue ?? 0, metrics?.currency ?? null)}</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Diferencia</p>
              <p className="mt-2 text-2xl font-semibold">{formatSignedCurrency(revenueDifference, metrics?.currency ?? null)}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-600">
            Las diferencias suelen venir de descuentos, envios, impuestos o redondeos entre el total final del pedido y la suma de lineas.
          </p>
        </section>
      ) : null}

      <SyncControl
        autoRun={autoSync}
        hasConnection={Boolean(summary.connection)}
        lastSyncFinishedAt={summary.latestSyncJob?.finishedAt?.toISOString() ?? null}
        lastSyncMessage={latestSyncMessage}
        lastSyncStatus={latestSyncStatus}
        orderCount={summary.orderCount}
        productCount={summary.productCount}
        storeId={summary.connection?.storeId}
        variantCount={summary.variantCount}
      />

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SalesTrendChart data={trend} />
        <InsightCard
          title="Resumen semanal"
          body={
            snapshotCard?.summary ??
            (latestSyncStatus === "succeeded"
              ? `La ultima sincronizacion termino bien. ID del ultimo job: ${summary.latestSyncJob?.id}.`
              : latestSyncStatus === "failed"
                ? `La ultima sincronizacion fallo. ${summary.latestSyncJob?.errorMessage ?? "Revisa el detalle del job."}`
                : summary.connection
                  ? "Los insights van a mejorar ahora que productos y pedidos estan entrando en Postgres."
                  : "Conecta primero una tienda y luego sincroniza productos para empezar a construir insights.")
          }
          chatHref={snapshotChatHref}
          evidence={snapshotCard?.evidence}
          shareText={snapshotCard?.shareText}
        />
      </section>

      <LowStockAlertCard alert={lowStockAlert} chatHref={lowStockChatHref} />

      <PinnedReportsPanel />

      <TopProductsTable
        currency={metrics?.currency ?? null}
        helperLabel={
          summary.connection
            ? `Venta bruta por linea en los ultimos ${windowConfig.label} sobre ${summary.orderCount} pedidos sincronizados`
            : "Esperando la sincronizacion inicial"
        }
        rows={topProducts}
      />
    </AppShell>
  );
}
