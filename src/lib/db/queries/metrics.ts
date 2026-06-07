import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orderItems, orders, products, stores } from "@/lib/db/schema";

type MetricsDateRangeInput = {
  endDate: Date;
  startDate: Date;
  storeId: string;
};

export type SalesSummary = {
  averageOrderValue: number;
  currency: string | null;
  orderCount: number;
  revenue: number;
  unitsSold: number;
};

export type SalesTrendPoint = {
  day: string;
  orderCount: number;
  revenue: number;
};

export type TopProductRow = {
  name: string;
  orderCount: number;
  revenue: number;
  unitsSold: number;
};

export type ComparedMetric = {
  absoluteChange: number;
  current: number;
  percentageChange: number | null;
  previous: number;
};

export type ComparePeriodsResult = {
  averageOrderValue: ComparedMetric;
  currency: string | null;
  orderCount: ComparedMetric;
  revenue: ComparedMetric;
  unitsSold: ComparedMetric;
};

function getMetricsFilter(input: MetricsDateRangeInput) {
  return and(
    eq(orders.storeId, input.storeId),
    gte(orders.createdAtTiendanube, input.startDate),
    lte(orders.createdAtTiendanube, input.endDate),
    isNull(orders.cancelledAt),
  );
}

export async function getSalesSummary(input: MetricsDateRangeInput): Promise<SalesSummary> {
  const db = getDb();
  const filter = getMetricsFilter(input);

  const [ordersAggregate] = await db
    .select({
      averageOrderValue: sql<number>`coalesce(avg(${orders.total})::double precision, 0)`,
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total})::double precision, 0)`,
    })
    .from(orders)
    .where(filter);

  const [itemsAggregate] = await db
    .select({
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity})::int, 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(filter);

  const [store] = await db
    .select({
      currency: stores.currency,
    })
    .from(stores)
    .where(eq(stores.id, input.storeId))
    .limit(1);

  return {
    averageOrderValue: ordersAggregate?.averageOrderValue ?? 0,
    currency: store?.currency ?? null,
    orderCount: ordersAggregate?.orderCount ?? 0,
    revenue: ordersAggregate?.revenue ?? 0,
    unitsSold: itemsAggregate?.unitsSold ?? 0,
  };
}

export async function getSalesTrend(input: MetricsDateRangeInput): Promise<SalesTrendPoint[]> {
  const db = getDb();

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAtTiendanube}), 'YYYY-MM-DD')`,
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total})::double precision, 0)`,
    })
    .from(orders)
    .where(getMetricsFilter(input))
    .groupBy(sql`date_trunc('day', ${orders.createdAtTiendanube})`)
    .orderBy(sql`date_trunc('day', ${orders.createdAtTiendanube})`);

  return rows.map((row) => ({
    day: row.day,
    orderCount: row.orderCount ?? 0,
    revenue: row.revenue ?? 0,
  }));
}

export async function getTopProducts(
  input: MetricsDateRangeInput & { limit?: number },
): Promise<TopProductRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      name: sql<string>`coalesce(${products.name}, ${orderItems.productName}, 'Unknown product')`,
      orderCount: sql<number>`count(distinct ${orders.id})::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.totalPrice})::double precision, 0)`,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity})::int, 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(getMetricsFilter(input))
    .groupBy(sql`coalesce(${products.name}, ${orderItems.productName}, 'Unknown product')`)
    .orderBy(desc(sql`coalesce(sum(${orderItems.totalPrice})::double precision, 0)`))
    .limit(input.limit ?? 5);

  return rows.map((row) => ({
    name: row.name,
    orderCount: row.orderCount ?? 0,
    revenue: row.revenue ?? 0,
    unitsSold: row.unitsSold ?? 0,
  }));
}

function compareMetric(current: number, previous: number): ComparedMetric {
  const absoluteChange = current - previous;

  return {
    absoluteChange,
    current,
    percentageChange: previous === 0 ? null : (absoluteChange / previous) * 100,
    previous,
  };
}

export async function comparePeriods(input: {
  currentEnd: Date;
  currentStart: Date;
  previousEnd: Date;
  previousStart: Date;
  storeId: string;
}): Promise<ComparePeriodsResult> {
  const [current, previous] = await Promise.all([
    getSalesSummary({
      endDate: input.currentEnd,
      startDate: input.currentStart,
      storeId: input.storeId,
    }),
    getSalesSummary({
      endDate: input.previousEnd,
      startDate: input.previousStart,
      storeId: input.storeId,
    }),
  ]);

  return {
    averageOrderValue: compareMetric(current.averageOrderValue, previous.averageOrderValue),
    currency: current.currency ?? previous.currency ?? null,
    orderCount: compareMetric(current.orderCount, previous.orderCount),
    revenue: compareMetric(current.revenue, previous.revenue),
    unitsSold: compareMetric(current.unitsSold, previous.unitsSold),
  };
}
