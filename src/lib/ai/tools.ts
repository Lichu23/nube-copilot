import { tool } from "ai";
import { z } from "zod";
import { getActiveTiendanubeConnection } from "@/lib/db/client";
import { comparePeriods, getLowStockOpportunities, getSalesSummary, getTopProducts } from "@/lib/db/queries/metrics";

export const aiToolNames = [
  "get_sales_summary",
  "compare_periods",
  "get_top_products",
  "get_weekly_business_snapshot",
  "get_low_stock_opportunities",
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

async function requireActiveStoreId() {
  const connection = await getActiveTiendanubeConnection();

  if (!connection) {
    throw new Error("No active Tiendanube connection found. Connect a store before using AI chat.");
  }

  return connection.storeId;
}

export async function executeComparePeriodsTool(input: z.infer<typeof dateWindowSchema>) {
  const storeId = await requireActiveStoreId();
  const { days, endDate, startDate } = resolveDateWindow(input);
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

  const comparison = await comparePeriods({
    currentEnd: endDate,
    currentStart: startDate,
    previousEnd: previousEndDate,
    previousStart: previousStartDate,
    storeId,
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

export async function executeSalesSummaryTool(input: z.infer<typeof dateWindowSchema>) {
  const storeId = await requireActiveStoreId();
  const { days, endDate, startDate } = resolveDateWindow(input);
  const summary = await getSalesSummary({
    endDate,
    startDate,
    storeId,
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

export async function executeTopProductsTool(input: z.infer<typeof dateWindowSchema> & { limit?: number | string }) {
  const storeId = await requireActiveStoreId();
  const { days, endDate, startDate } = resolveDateWindow(input);
  const limit = toInteger(input.limit, 5);
  const products = await getTopProducts({
    endDate,
    limit,
    startDate,
    storeId,
  });
  const summary = await getSalesSummary({
    endDate,
    startDate,
    storeId,
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

export async function executeWeeklyBusinessSnapshotTool() {
  const days = 7;
  const [summary, comparison, topProducts] = await Promise.all([
    executeSalesSummaryTool({ days }),
    executeComparePeriodsTool({ days }),
    executeTopProductsTool({ days, limit: 3 }),
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
}) {
  const storeId = await requireActiveStoreId();
  const limit = toInteger(input.limit, 5);
  const recentDays = toInteger(input.recentDays, 30);
  const stockThreshold = toInteger(input.stockThreshold, 5);
  const opportunities = await getLowStockOpportunities({
    limit,
    recentDays,
    stockThreshold,
    storeId,
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

export function buildAiTools() {
  return {
    compare_periods: tool({
      description:
        "Compare the current trailing period versus the immediately preceding period for revenue, orders, units sold, and average order value.",
      inputSchema: dateWindowSchema,
      execute: executeComparePeriodsTool,
    }),
    get_sales_summary: tool({
      description:
        "Get a sales summary for a trailing date window including revenue, order count, units sold, and average order value.",
      inputSchema: dateWindowSchema,
      execute: executeSalesSummaryTool,
    }),
    get_top_products: tool({
      description: "Get top products by revenue for a trailing date window.",
      inputSchema: dateWindowSchema.extend({
        limit: numericIntegerSchema(1, 10).default(5).optional(),
      }),
      execute: executeTopProductsTool,
    }),
    get_weekly_business_snapshot: tool({
      description: "Get a weekly business snapshot with summary metrics, trend comparison, and top products.",
      inputSchema: z.object({}),
      execute: executeWeeklyBusinessSnapshotTool,
    }),
    get_low_stock_opportunities: tool({
      description: "Get products that have low stock and recent selling activity.",
      inputSchema: z.object({
        limit: numericIntegerSchema(1, 10).default(5).optional(),
        recentDays: numericIntegerSchema(1, 90).default(30).optional(),
        stockThreshold: numericIntegerSchema(0, 20).default(5).optional(),
      }),
      execute: executeLowStockOpportunitiesTool,
    }),
  };
}
