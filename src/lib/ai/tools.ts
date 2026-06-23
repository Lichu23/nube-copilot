import { tool } from "ai";
import { z } from "zod";
import { getActiveTiendanubeConnection } from "@/lib/db/client";
import { comparePeriods, getLowStockOpportunities, getSalesSummary, getSalesTrend, getTopProducts } from "@/lib/db/queries/metrics";

export const aiToolNames = [
  "get_sales_summary",
  "get_average_order_value",
  "get_sales_trend",
  "get_monthly_trend",
  "compare_periods",
  "get_top_products",
  "get_weekly_business_snapshot",
  "get_low_stock_opportunities",
  "get_next_week_priorities",
] as const;

const numericIntegerSchema = (min: number, max: number) =>
  z.union([z.number().int().min(min).max(max), z.string().regex(/^\d+$/)]);

function toInteger(value: number | string | undefined, fallback: number) {
  return typeof value === "string" ? Number(value) : (value ?? fallback);
}

const dateWindowSchema = z.object({
  days: numericIntegerSchema(1, 90).default(7).describe("How many trailing days to analyze."),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Optional end date in YYYY-MM-DD format. Omit to use today."),
});

function resolveDateWindow(input: z.infer<typeof dateWindowSchema>) {
  const endDate = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : new Date();
  const days = toInteger(input.days, 7);

  if (Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid endDate. Use YYYY-MM-DD.");
  }

  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    days,
    endDate,
    startDate,
  };
}

function getMonthToDateWindow() {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );

  const days = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

  return { days, endDate, startDate };
}

function toIsoDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fillMissingTrendDays(
  trend: Array<{ day: string; orderCount: number; revenue: number }>,
  startDate: Date,
  endDate: Date,
) {
  const trendByDay = new Map(trend.map((item) => [item.day, item]));
  const days: Array<{ day: string; orderCount: number; revenue: number }> = [];
  const current = new Date(startDate.getTime());

  while (current.getTime() <= endDate.getTime()) {
    const dayKey = toIsoDateKey(current);
    const existing = trendByDay.get(dayKey);

    days.push(
      existing ?? {
        day: dayKey,
        orderCount: 0,
        revenue: 0,
      },
    );

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

async function requireActiveStoreId(storeId?: string) {
  const connection = await getActiveTiendanubeConnection(storeId);

  if (!connection) {
    throw new Error("No active Tiendanube connection found. Connect a store before using AI chat.");
  }

  return connection.storeId;
}

export async function executeComparePeriodsTool(
  input: z.infer<typeof dateWindowSchema>,
  storeId?: string,
) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const { days, endDate, startDate } = resolveDateWindow(input);
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

  const comparison = await comparePeriods({
    currentEnd: endDate,
    currentStart: startDate,
    previousEnd: previousEndDate,
    previousStart: previousStartDate,
    storeId: resolvedStoreId,
  });

  return {
    comparison,
    currentWindow: {
      endDate: endDate.toISOString().slice(0, 10),
      label: `Ultimos ${days} dia${days === 1 ? "" : "s"}`,
      startDate: startDate.toISOString().slice(0, 10),
    },
    previousWindow: {
      endDate: previousEndDate.toISOString().slice(0, 10),
      label: `Periodo anterior (${days} dia${days === 1 ? "" : "s"})`,
      startDate: previousStartDate.toISOString().slice(0, 10),
    },
  };
}

export async function executeSalesSummaryTool(
  input: z.infer<typeof dateWindowSchema>,
  storeId?: string,
) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const { days, endDate, startDate } = resolveDateWindow(input);
  const summary = await getSalesSummary({
    endDate,
    startDate,
    storeId: resolvedStoreId,
  });

  return {
    summary,
    window: {
      days,
      endDate: endDate.toISOString().slice(0, 10),
      startDate: startDate.toISOString().slice(0, 10),
    },
  };
}

export async function executeTopProductsTool(
  input: z.infer<typeof dateWindowSchema> & { limit?: number | string },
  storeId?: string,
) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const { days, endDate, startDate } = resolveDateWindow(input);
  const limit = toInteger(input.limit, 5);
  const products = await getTopProducts({
    endDate,
    limit,
    startDate,
    storeId: resolvedStoreId,
  });
  const summary = await getSalesSummary({
    endDate,
    startDate,
    storeId: resolvedStoreId,
  });

  return {
    products,
    summary: {
      currency: summary.currency,
      revenue: summary.revenue,
    },
    window: {
      days,
      endDate: endDate.toISOString().slice(0, 10),
      limit,
      startDate: startDate.toISOString().slice(0, 10),
    },
  };
}

export async function executeWeeklyBusinessSnapshotTool(storeId?: string) {
  const days = 7;
  const [summary, comparison, topProducts] = await Promise.all([
    executeSalesSummaryTool({ days }, storeId),
    executeComparePeriodsTool({ days }, storeId),
    executeTopProductsTool({ days, limit: 3 }, storeId),
  ]);

  return {
    comparison,
    summary,
    topProducts,
    window: {
      days,
      label: "Ultimos 7 dias",
    },
  };
}

export async function executeLowStockOpportunitiesTool(input: {
  limit?: number | string;
  recentDays?: number | string;
  stockThreshold?: number | string;
}, storeId?: string) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const limit = toInteger(input.limit, 5);
  const recentDays = toInteger(input.recentDays, 30);
  const stockThreshold = toInteger(input.stockThreshold, 5);
  const opportunities = await getLowStockOpportunities({
    limit,
    recentDays,
    stockThreshold,
    storeId: resolvedStoreId,
  });

  return {
    opportunities,
    window: {
      limit,
      recentDays,
      stockThreshold,
    },
  };
}

export async function executeAverageOrderValueTool(input: z.infer<typeof dateWindowSchema>, storeId?: string) {
  return executeSalesSummaryTool(input, storeId);
}

export async function executeSalesTrendTool(input: z.infer<typeof dateWindowSchema>, storeId?: string) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const { days, endDate, startDate } = resolveDateWindow(input);
  const rawTrend = await getSalesTrend({
    endDate,
    startDate,
    storeId: resolvedStoreId,
  });
  const trend = fillMissingTrendDays(rawTrend, startDate, endDate);
  const summary = await getSalesSummary({
    endDate,
    startDate,
    storeId: resolvedStoreId,
  });

  const peakDay = trend.reduce<{ day: string; orderCount: number; revenue: number } | undefined>((best, item) => {
    if (!best) return item;
    if (item.revenue > best.revenue) return item;
    if (item.revenue === best.revenue && item.orderCount > best.orderCount) return item;
    return best;
  }, undefined);
  const normalizedPeakDay = peakDay && (peakDay.revenue > 0 || peakDay.orderCount > 0) ? peakDay : undefined;

  return {
    peakDay: normalizedPeakDay,
    summary,
    trend,
    window: {
      days,
      endDate: endDate.toISOString().slice(0, 10),
      startDate: startDate.toISOString().slice(0, 10),
    },
  };
}

export async function executeMonthlyTrendTool(storeId?: string) {
  const resolvedStoreId = await requireActiveStoreId(storeId);
  const { days, endDate, startDate } = getMonthToDateWindow();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const [rawTrend, current, previous] = await Promise.all([
    getSalesTrend({
      endDate,
      startDate,
      storeId: resolvedStoreId,
    }),
    getSalesSummary({
      endDate,
      startDate,
      storeId: resolvedStoreId,
    }),
    getSalesSummary({
      endDate: previousEndDate,
      startDate: previousStartDate,
      storeId: resolvedStoreId,
    }),
  ]);
  const trend = fillMissingTrendDays(rawTrend, startDate, endDate);

  const peakDay = trend.reduce<{ day: string; orderCount: number; revenue: number } | undefined>((best, item) => {
    if (!best) return item;
    if (item.revenue > best.revenue) return item;
    if (item.revenue === best.revenue && item.orderCount > best.orderCount) return item;
    return best;
  }, undefined);
  const normalizedPeakDay = peakDay && (peakDay.revenue > 0 || peakDay.orderCount > 0) ? peakDay : undefined;

  return {
    comparison: {
      averageOrderValue: {
        current: current.averageOrderValue,
        previous: previous.averageOrderValue,
      },
      currency: current.currency ?? previous.currency ?? null,
      orderCount: {
        current: current.orderCount,
        previous: previous.orderCount,
      },
      revenue: {
        current: current.revenue,
        previous: previous.revenue,
      },
      unitsSold: {
        current: current.unitsSold,
        previous: previous.unitsSold,
      },
    },
    peakDay: normalizedPeakDay,
    summary: current,
    trend,
    window: {
      days,
      endDate: endDate.toISOString().slice(0, 10),
      startDate: startDate.toISOString().slice(0, 10),
    },
    previousWindow: {
      endDate: previousEndDate.toISOString().slice(0, 10),
      startDate: previousStartDate.toISOString().slice(0, 10),
    },
  };
}

export async function executeNextWeekPrioritiesTool(storeId?: string) {
  const [weeklySnapshot, lowStock] = await Promise.all([
    executeWeeklyBusinessSnapshotTool(storeId),
    executeLowStockOpportunitiesTool({ limit: 3, recentDays: 30, stockThreshold: 5 }, storeId),
  ]);

  const currency = weeklySnapshot.summary.summary.currency;
  const topProduct = weeklySnapshot.topProducts.products[0] ?? null;
  const stockRisk = lowStock.opportunities[0] ?? null;
  const revenueDown = weeklySnapshot.comparison.comparison.revenue.absoluteChange < 0;

  const priorities = [
    topProduct
      ? {
          label: `Priorizá ${topProduct.name}`,
          nextStep: revenueDown
            ? "mantené visibilidad y stock para aprovechar el rebote"
            : "destacalo con promo, bundle o ubicación principal",
          reason: "es el producto que más explica la venta reciente",
        }
      : {
          label: "Priorizá el catálogo con demanda real",
          nextStep: "buscá los productos con ventas recientes antes de invertir en promo",
          reason: "necesitamos un ganador visible para empujar la semana",
        },
    stockRisk
      ? {
          label: stockRisk.stock <= 0 ? `Reponé ${stockRisk.name}` : `Protegé ${stockRisk.name}`,
          nextStep: stockRisk.stock <= 0
            ? "reponelo antes de aumentar tráfico"
            : "confirmá inventario antes de empujar más demanda",
          reason: `${stockRisk.recentUnitsSold} unidades recientes muestran que hay demanda`,
        }
      : {
          label: "Revisá el inventario de los productos top",
          nextStep: "confirmá que los ganadores tengan stock suficiente",
          reason: "no detecté riesgo de stock en la muestra más urgente",
        },
    {
      label: "Evitá promocionar productos sin demanda ni stock",
      nextStep: "destiná el esfuerzo comercial a los productos con tracción",
      reason: "la prioridad es vender más con menos fricción operativa",
    },
  ];

  return {
    lowStockOpportunities: lowStock.opportunities,
    summary: weeklySnapshot.summary.summary,
    topProducts: weeklySnapshot.topProducts.products,
    window: {
      days: weeklySnapshot.window.days,
      label: weeklySnapshot.window.label,
    },
    priorities,
    revenueChange: weeklySnapshot.comparison.comparison.revenue,
    currency,
  };
}

export function buildAiTools(options?: { storeId?: string }) {
  const storeId = options?.storeId;
  return {
    compare_periods: tool({
      description:
        "Compare the current trailing period versus the immediately preceding period for revenue, orders, units sold, and average order value.",
      inputSchema: dateWindowSchema,
      execute: (input) => executeComparePeriodsTool(input, storeId),
    }),
    get_sales_summary: tool({
      description:
        "Get a sales summary for a trailing date window including revenue, order count, units sold, and average order value.",
      inputSchema: dateWindowSchema,
      execute: (input) => executeSalesSummaryTool(input, storeId),
    }),
    get_average_order_value: tool({
      description:
        "Get the average order value for a trailing date window, along with supporting sales context.",
      inputSchema: dateWindowSchema,
      execute: (input) => executeAverageOrderValueTool(input, storeId),
    }),
    get_sales_trend: tool({
      description:
        "Get daily sales trend for a trailing date window and identify the peak day by revenue.",
      inputSchema: dateWindowSchema,
      execute: (input) => executeSalesTrendTool(input, storeId),
    }),
    get_monthly_trend: tool({
      description:
        "Get a month-to-date sales trend, peak day, and comparison against the previous equivalent period.",
      inputSchema: z.object({}),
      execute: () => executeMonthlyTrendTool(storeId),
    }),
    get_top_products: tool({
      description: "Get top products by revenue for a trailing date window.",
      inputSchema: dateWindowSchema.extend({
        limit: numericIntegerSchema(1, 10).default(5).optional(),
      }),
      execute: (input) => executeTopProductsTool(input, storeId),
    }),
    get_weekly_business_snapshot: tool({
      description: "Get a weekly business snapshot with summary metrics, trend comparison, and top products.",
      inputSchema: z.object({}),
      execute: () => executeWeeklyBusinessSnapshotTool(storeId),
    }),
    get_low_stock_opportunities: tool({
      description: "Get products that have low stock and recent selling activity.",
      inputSchema: z.object({
        limit: numericIntegerSchema(1, 10).default(5).optional(),
        recentDays: numericIntegerSchema(1, 90).default(30).optional(),
        stockThreshold: numericIntegerSchema(0, 20).default(5).optional(),
      }),
      execute: (input) => executeLowStockOpportunitiesTool(input, storeId),
    }),
    get_next_week_priorities: tool({
      description:
        "Get a ranked action plan for next week based on recent sales performance, top products, and stock risk.",
      inputSchema: z.object({}),
      execute: () => executeNextWeekPrioritiesTool(storeId),
    }),
  };
}
