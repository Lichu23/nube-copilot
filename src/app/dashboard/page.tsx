import Link from "next/link";
import { getDashboardSyncSummary } from "@/lib/db/client";
import { comparePeriods, getSalesSummary, getSalesTrend, getTopProducts } from "@/lib/db/queries/metrics";
import { InsightCard } from "@/components/dashboard/insight-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { SyncControl } from "@/components/dashboard/sync-control";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { AppShell } from "@/components/layout/app-shell";
import { buildWeeklySnapshotCardContent } from "@/lib/weekly-snapshot";

const compareWindowConfig = {
  "1d": { days: 1, label: "1d", title: "Last 1 day" },
  "7d": { days: 7, label: "7d", title: "Last 7 days" },
  "30d": { days: 30, label: "30d", title: "Last 30 days" },
} as const;

type CompareWindowKey = keyof typeof compareWindowConfig;

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("en", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatSignedCurrency(value: number, currency: string | null) {
  const absolute = formatCurrency(Math.abs(value), currency);
  return value < 0 ? `-${absolute}` : absolute;
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatSignedPercent(value: number | null, label: string) {
  if (value == null) {
    return `vs previous ${label} unavailable`;
  }

  const rounded = Math.abs(value).toFixed(1);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${rounded}% vs previous ${label}`;
}

function getCompareWindow(value: string | string[] | undefined): CompareWindowKey {
  if (typeof value !== "string") {
    return "7d";
  }

  return value in compareWindowConfig ? (value as CompareWindowKey) : "7d";
}

function parseAsOfDate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAsOfInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildDashboardHref(compareWindow: CompareWindowKey, asOf: string | null) {
  const searchParams = new URLSearchParams({ compareWindow });

  if (asOf) {
    searchParams.set("asOf", asOf);
  }

  return `/dashboard?${searchParams.toString()}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const autoSync = typeof params.autoSync === "string" && params.autoSync === "1";
  const compareWindow = getCompareWindow(params.compareWindow);
  const windowConfig = compareWindowConfig[compareWindow];
  const isDevOverrideEnabled = process.env.NODE_ENV !== "production";
  const asOfOverride = isDevOverrideEnabled ? parseAsOfDate(params.asOf) : null;
  const endDate = asOfOverride ?? new Date();
  const asOfInputValue = formatAsOfInputValue(endDate);
  const summary = await getDashboardSyncSummary();
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
  const latestSyncMetadata =
    summary.latestSyncJob?.metadata && typeof summary.latestSyncJob.metadata === "object"
      ? (summary.latestSyncJob.metadata as Record<string, unknown>)
      : null;
  const latestImportedProductCount =
    latestSyncMetadata && typeof latestSyncMetadata.productCount === "number"
      ? latestSyncMetadata.productCount
      : summary.productCount;
  const latestImportedVariantCount =
    latestSyncMetadata && typeof latestSyncMetadata.variantCount === "number"
      ? latestSyncMetadata.variantCount
      : summary.variantCount;
  const latestImportedOrderCount =
    latestSyncMetadata && typeof latestSyncMetadata.orderCount === "number"
      ? latestSyncMetadata.orderCount
      : summary.orderCount;
  const latestSyncMessage = summary.connection
    ? latestSyncStatus === "succeeded"
      ? `Latest sync captured ${latestImportedProductCount} products, ${latestImportedVariantCount} variants, and ${latestImportedOrderCount} orders.`
      : latestSyncStatus === "failed"
        ? String(summary.latestSyncJob?.errorMessage ?? "Latest sync failed.")
        : "Ready to run your first sync."
    : "No Tiendanube connection found yet.";

  const startDate = new Date(endDate.getTime() - windowConfig.days * 24 * 60 * 60 * 1000);
  const trendStartDate = startDate;
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - windowConfig.days * 24 * 60 * 60 * 1000);
  const weeklyWindowDays = 7;
  const weeklyStartDate = new Date(endDate.getTime() - weeklyWindowDays * 24 * 60 * 60 * 1000);
  const weeklyPreviousEndDate = new Date(weeklyStartDate.getTime() - 1);
  const weeklyPreviousStartDate = new Date(
    weeklyPreviousEndDate.getTime() - weeklyWindowDays * 24 * 60 * 60 * 1000,
  );

  const metrics = summary.connection
    ? await getSalesSummary({
        endDate,
        startDate,
        storeId: summary.connection.storeId,
      })
    : null;
  const trend = summary.connection
    ? await getSalesTrend({
        endDate,
        startDate: trendStartDate,
        storeId: summary.connection.storeId,
      })
    : [];
  const periodComparison = summary.connection
    ? await comparePeriods({
        currentEnd: endDate,
        currentStart: startDate,
        previousEnd: previousEndDate,
        previousStart: previousStartDate,
        storeId: summary.connection.storeId,
      })
    : null;
  const topProducts = summary.connection
    ? await getTopProducts({
        endDate,
        limit: 5,
        startDate,
        storeId: summary.connection.storeId,
      })
    : [];
  const weeklySnapshotMetrics = summary.connection
    ? await getSalesSummary({
        endDate,
        startDate: weeklyStartDate,
        storeId: summary.connection.storeId,
      })
    : null;
  const weeklySnapshotComparison = summary.connection
    ? await comparePeriods({
        currentEnd: endDate,
        currentStart: weeklyStartDate,
        previousEnd: weeklyPreviousEndDate,
        previousStart: weeklyPreviousStartDate,
        storeId: summary.connection.storeId,
      })
    : null;
  const weeklySnapshotTopProducts = summary.connection
    ? await getTopProducts({
        endDate,
        limit: 1,
        startDate: weeklyStartDate,
        storeId: summary.connection.storeId,
      })
    : [];
  const weeklySnapshotTopProduct = weeklySnapshotTopProducts[0] ?? null;
  const grossProductSales = topProducts.reduce((total, product) => total + product.revenue, 0);
  const revenueDifference = grossProductSales - (metrics?.revenue ?? 0);
  const hasReconciliationData = Boolean(summary.connection && metrics);
  const snapshotCard = buildWeeklySnapshotCardContent({
    comparison: weeklySnapshotComparison,
    metrics: weeklySnapshotMetrics,
    topProduct: weeklySnapshotTopProduct,
    windowLabel: "last 7 days",
  });
  const snapshotChatHref = snapshotCard
    ? `/?${new URLSearchParams({
        prompt: snapshotCard.askAiPrompt,
      }).toString()}`
    : undefined;

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Trust layer for the AI analyst"
      description="The dashboard exists so merchants can verify the numbers behind every recommendation."
    >
      {isDevOverrideEnabled ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Dev comparison override</h2>
                <p className="text-sm text-zinc-600">
                  Use shorter windows and a custom as-of date to test period-over-period changes without creating manual Tiendanube sales.
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
                <span className="font-medium">As of date</span>
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
                  Apply date
                </button>
                <Link
                  href={buildDashboardHref(compareWindow, null)}
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
                >
                  Use real today
                </Link>
              </div>
            </form>

            <p className="text-xs text-zinc-600">
              Effective as-of date: <span className="font-medium">{asOfInputValue}</span>
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={`Net revenue (${windowConfig.label})`}
          value={metrics ? formatCurrency(metrics.revenue, metrics.currency) : "$0.00"}
          helper={
            summary.connection
              ? `${formatSignedPercent(periodComparison?.revenue.percentageChange ?? null, windowConfig.label)} - Δ ${formatSignedCurrency(periodComparison?.revenue.absoluteChange ?? 0, metrics?.currency ?? null)}`
              : "Connect and sync a store to load real data."
          }
        />
        <MetricCard
          label={`Orders (${windowConfig.label})`}
          value={String(metrics?.orderCount ?? 0)}
          helper={
            summary.connection
              ? `${formatSignedPercent(periodComparison?.orderCount.percentageChange ?? null, windowConfig.label)} - Δ ${formatSignedNumber(periodComparison?.orderCount.absoluteChange ?? 0)} orders`
              : "Waiting for store connection."
          }
        />
        <MetricCard
          label={`Average order value (${windowConfig.label})`}
          value={metrics ? formatCurrency(metrics.averageOrderValue, metrics.currency) : "$0.00"}
          helper={
            summary.connection
              ? `${formatSignedPercent(periodComparison?.averageOrderValue.percentageChange ?? null, windowConfig.label)} - Units sold: ${metrics?.unitsSold ?? 0}`
              : "Waiting for store connection."
          }
        />
      </section>

      {hasReconciliationData ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Revenue reconciliation</h2>
            <p className="text-sm text-zinc-600">
              Gross product sales and net revenue answer different questions, so they may not match exactly.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Gross product sales</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(grossProductSales, metrics?.currency ?? null)}</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Net revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(metrics?.revenue ?? 0, metrics?.currency ?? null)}</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Difference</p>
              <p className="mt-2 text-2xl font-semibold">{formatSignedCurrency(revenueDifference, metrics?.currency ?? null)}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-600">
            Differences usually come from discounts, shipping, taxes, or rounding between final order totals and summed line items.
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
          title="Weekly snapshot"
          body={
            snapshotCard?.summary ??
            (latestSyncStatus === "succeeded"
              ? `Latest sync completed successfully. Last job id: ${summary.latestSyncJob?.id}.`
              : latestSyncStatus === "failed"
                ? `The last sync failed. ${summary.latestSyncJob?.errorMessage ?? "Check the sync job details."}`
                : summary.connection
                  ? "Insights will improve now that products and orders are syncing into Postgres."
                  : "Connect a store first, then sync products to start building insights.")
          }
          chatHref={snapshotChatHref}
          evidence={snapshotCard?.evidence}
          shareText={snapshotCard?.shareText}
        />
      </section>

      <TopProductsTable
        currency={metrics?.currency ?? null}
        helperLabel={
          summary.connection
            ? `Gross line-item sales from the last ${windowConfig.label} across ${summary.orderCount} synced orders`
            : "Waiting for initial sync"
        }
        rows={topProducts}
      />
    </AppShell>
  );
}
