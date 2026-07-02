import { comparePeriods, getLowStockOpportunities, getSalesSummary, getSalesTrend, getTopProducts } from "@/lib/db/queries/metrics";
import { buildWeeklySnapshotCardContent } from "@/lib/weekly-snapshot";
import {
  compareWindowConfig,
  DEFAULT_COMPARE_WINDOW,
  LOW_STOCK_ALERT_LIMIT,
  LOW_STOCK_RECENT_DAYS,
  LOW_STOCK_THRESHOLD,
  TOP_PRODUCTS_LIMIT,
  WEEKLY_SNAPSHOT_DAYS,
  WEEKLY_TOP_PRODUCTS_LIMIT,
  type CompareWindowKey,
} from "./config";
import { buildLowStockAlert } from "./low-stock-alert";

type DashboardSyncSummary = Awaited<ReturnType<typeof import("@/lib/db/client").getDashboardSyncSummary>>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function shiftUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function getCompareWindow(value: string | string[] | undefined): CompareWindowKey {
  if (typeof value !== "string") {
    return DEFAULT_COMPARE_WINDOW;
  }

  return value in compareWindowConfig ? (value as CompareWindowKey) : DEFAULT_COMPARE_WINDOW;
}

export function parseAsOfDate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAsOfInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildChatHref(prompt: string, storeId?: string | null) {
  const searchParams = new URLSearchParams({ prompt });

  if (storeId) {
    searchParams.set("storeId", storeId);
  }

  return `/chat?${searchParams.toString()}`;
}

export function buildDashboardDateWindows(input: { compareWindow: CompareWindowKey; endDate: Date }) {
  const windowConfig = compareWindowConfig[input.compareWindow];
  const windowEndDate = endOfUtcDay(input.endDate);
  const startDate = startOfUtcDay(shiftUtcDays(windowEndDate, -(windowConfig.days - 1)));
  const previousEndDate = endOfUtcDay(shiftUtcDays(startDate, -1));
  const previousStartDate = startOfUtcDay(shiftUtcDays(previousEndDate, -(windowConfig.days - 1)));
  const weeklyStartDate = startOfUtcDay(shiftUtcDays(windowEndDate, -(WEEKLY_SNAPSHOT_DAYS - 1)));
  const weeklyPreviousEndDate = endOfUtcDay(shiftUtcDays(weeklyStartDate, -1));
  const weeklyPreviousStartDate = startOfUtcDay(
    shiftUtcDays(weeklyPreviousEndDate, -(WEEKLY_SNAPSHOT_DAYS - 1)),
  );

  return {
    endDate: windowEndDate,
    previousEndDate,
    previousStartDate,
    startDate,
    weeklyPreviousEndDate,
    weeklyPreviousStartDate,
    weeklyStartDate,
    windowConfig,
  };
}

export function getLatestImportedCounts(summary: DashboardSyncSummary) {
  const metadata =
    summary.latestSyncJob?.metadata && typeof summary.latestSyncJob.metadata === "object"
      ? (summary.latestSyncJob.metadata as Record<string, unknown>)
      : null;

  return {
    orderCount: metadata && typeof metadata.orderCount === "number" ? metadata.orderCount : summary.orderCount,
    productCount: metadata && typeof metadata.productCount === "number" ? metadata.productCount : summary.productCount,
    variantCount: metadata && typeof metadata.variantCount === "number" ? metadata.variantCount : summary.variantCount,
  };
}

export function getLatestSyncOutcome(summary: DashboardSyncSummary) {
  const metadata =
    summary.latestSyncJob?.metadata && typeof summary.latestSyncJob.metadata === "object"
      ? (summary.latestSyncJob.metadata as Record<string, unknown>)
      : null;

  return typeof metadata?.syncOutcome === "string" ? metadata.syncOutcome : null;
}

export function getLatestSyncMessage(summary: DashboardSyncSummary) {
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
  const latestSyncOutcome = getLatestSyncOutcome(summary);
  const counts = getLatestImportedCounts(summary);

  if (!summary.connection) {
    return "Todavia no hay una conexion Tiendanube.";
  }

  if (latestSyncOutcome === "partial") {
    return `La ultima sincronizacion quedo parcial: guardamos ${counts.productCount} productos, ${counts.variantCount} variantes y ${counts.orderCount} pedidos, pero fallo al leer pedidos completos.`;
  }

  if (latestSyncStatus === "succeeded") {
    return `La ultima sincronizacion trajo ${counts.productCount} productos, ${counts.variantCount} variantes y ${counts.orderCount} pedidos.`;
  }

  if (latestSyncStatus === "failed") {
    return String(summary.latestSyncJob?.errorMessage ?? "La ultima sincronizacion fallo.");
  }

  return "Listo para correr la primera sincronizacion.";
}

export async function getDashboardData(input: {
  compareWindow: CompareWindowKey;
  endDate: Date;
  summary: DashboardSyncSummary;
}) {
  const windows = buildDashboardDateWindows({ compareWindow: input.compareWindow, endDate: input.endDate });
  const storeId = input.summary.connection?.storeId;

  if (!storeId) {
    return {
      grossProductSales: 0,
      lowStockAlert: null,
      lowStockChatHref: undefined,
      lowStockRows: [],
      metrics: null,
      periodComparison: null,
      revenueDifference: 0,
      snapshotCard: null,
      snapshotChatHref: undefined,
      topProducts: [],
      trend: [],
      weeklySnapshotComparison: null,
      weeklySnapshotMetrics: null,
      weeklySnapshotTopProduct: null,
      windows,
    };
  }

  const [
    metrics,
    trend,
    periodComparison,
    topProducts,
    weeklySnapshotMetrics,
    weeklySnapshotComparison,
    weeklySnapshotTopProducts,
    lowStockRows,
  ] = await Promise.all([
      getSalesSummary({ endDate: input.endDate, startDate: windows.startDate, storeId }),
      getSalesTrend({ endDate: input.endDate, startDate: windows.startDate, storeId }),
      comparePeriods({
        currentEnd: input.endDate,
        currentStart: windows.startDate,
        previousEnd: windows.previousEndDate,
        previousStart: windows.previousStartDate,
        storeId,
      }),
      getTopProducts({ endDate: input.endDate, limit: TOP_PRODUCTS_LIMIT, startDate: windows.startDate, storeId }),
      getSalesSummary({ endDate: input.endDate, startDate: windows.weeklyStartDate, storeId }),
      comparePeriods({
        currentEnd: input.endDate,
        currentStart: windows.weeklyStartDate,
        previousEnd: windows.weeklyPreviousEndDate,
        previousStart: windows.weeklyPreviousStartDate,
        storeId,
      }),
      getTopProducts({
        endDate: input.endDate,
        limit: WEEKLY_TOP_PRODUCTS_LIMIT,
        startDate: windows.weeklyStartDate,
        storeId,
      }),
      getLowStockOpportunities({
        limit: LOW_STOCK_ALERT_LIMIT,
        recentDays: LOW_STOCK_RECENT_DAYS,
        stockThreshold: LOW_STOCK_THRESHOLD,
        storeId,
      }),
    ]);

  const weeklySnapshotTopProduct = weeklySnapshotTopProducts[0] ?? null;
  const lowStockAlert = buildLowStockAlert({
    recentDays: LOW_STOCK_RECENT_DAYS,
    rows: lowStockRows,
    stockThreshold: LOW_STOCK_THRESHOLD,
  });
  const lowStockChatHref = buildChatHref("Que productos estan en riesgo de quedarse sin stock?", storeId);
  const grossProductSales = topProducts.reduce((total, product) => total + product.revenue, 0);
  const revenueDifference = grossProductSales - metrics.revenue;
  const snapshotCard = buildWeeklySnapshotCardContent({
    comparison: weeklySnapshotComparison,
    metrics: weeklySnapshotMetrics,
    topProduct: weeklySnapshotTopProduct,
    windowLabel: "ultimos 7 dias",
  });
  const snapshotChatHref = snapshotCard ? buildChatHref(snapshotCard.askAiPrompt, storeId) : undefined;

  return {
    grossProductSales,
    lowStockAlert,
    lowStockChatHref,
    lowStockRows,
    metrics,
    periodComparison,
    revenueDifference,
    snapshotCard,
    snapshotChatHref,
    topProducts,
    trend,
    weeklySnapshotComparison,
    weeklySnapshotMetrics,
    weeklySnapshotTopProduct,
    windows,
  };
}
