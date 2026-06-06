import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  customers,
  orderItems,
  orders,
  productVariants,
  products,
  storeConnections,
  stores,
  syncJobs,
} from "@/lib/db/schema";
import type { TiendanubeStoreMetadata } from "@/lib/tiendanube/types";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!dbInstance) {
    const client = postgres(process.env.DATABASE_URL, {
      prepare: false,
    });

    dbInstance = drizzle(client);
  }

  return dbInstance;
}

type PersistTiendanubeConnectionInput = TiendanubeStoreMetadata & {
  accessTokenEncrypted: string;
  scopes: string[];
  storeExternalId: string;
};

export async function persistTiendanubeConnection(input: PersistTiendanubeConnectionInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [existingStore] = await tx
      .select()
      .from(stores)
      .where(eq(stores.tiendanubeStoreId, input.storeExternalId))
      .limit(1);

    const now = new Date();
    const [store] = existingStore
      ? await tx
          .update(stores)
          .set({
            country: input.country ?? existingStore.country,
            currency: input.currency ?? existingStore.currency,
            name: input.name ?? existingStore.name,
            updatedAt: now,
          })
          .where(eq(stores.id, existingStore.id))
          .returning()
      : await tx
          .insert(stores)
          .values({
            country: input.country ?? null,
            currency: input.currency ?? null,
            name: input.name ?? null,
            tiendanubeStoreId: input.storeExternalId,
          })
          .returning();

    const [existingConnection] = await tx
      .select()
      .from(storeConnections)
      .where(eq(storeConnections.storeId, store.id))
      .limit(1);

    if (existingConnection) {
      await tx
        .update(storeConnections)
        .set({
          accessTokenEncrypted: input.accessTokenEncrypted,
          scopes: input.scopes,
          status: "active",
          updatedAt: now,
        })
        .where(eq(storeConnections.id, existingConnection.id));
    } else {
      await tx.insert(storeConnections).values({
        accessTokenEncrypted: input.accessTokenEncrypted,
        scopes: input.scopes,
        status: "active",
        storeId: store.id,
      });
    }

    return { storeId: store.id };
  });
}

export async function getActiveTiendanubeConnection(storeId?: string) {
  const db = getDb();
  const filters = [eq(storeConnections.status, "active")];

  if (storeId) {
    filters.push(eq(stores.id, storeId));
  }

  const connections = await db
    .select({
      accessTokenEncrypted: storeConnections.accessTokenEncrypted,
      scopes: storeConnections.scopes,
      status: storeConnections.status,
      storeExternalId: stores.tiendanubeStoreId,
      storeId: stores.id,
      storeName: stores.name,
    })
    .from(storeConnections)
    .innerJoin(stores, eq(storeConnections.storeId, stores.id))
    .where(and(...filters))
    .limit(storeId ? 1 : 2);

  if (connections.length === 0) {
    return null;
  }

  if (!storeId && connections.length > 1) {
    throw new Error("More than one active Tiendanube store was found. Pass storeId explicitly.");
  }

  return connections[0];
}

type UpsertProductsInput = {
  storeId: string;
  productsToUpsert: Array<{
    handle: string | null;
    name: string | null;
    published: boolean | null;
    raw: unknown;
    tiendanubeProductId: string;
    variants: Array<{
      price: string | null;
      raw: unknown;
      sku: string | null;
      stock: number | null;
      tiendanubeVariantId: string;
    }>;
  }>;
};

type UpsertOrdersInput = {
  ordersToUpsert: Array<{
    cancelledAt: Date | null;
    createdAtTiendanube: Date | null;
    currency: string | null;
    customer: {
      email: string | null;
      name: string | null;
      phone: string | null;
      raw: unknown;
      tiendanubeCustomerId: string;
    } | null;
    items: Array<{
      productName: string | null;
      quantity: number;
      tiendanubeProductId: string | null;
      tiendanubeVariantId: string | null;
      totalPrice: string | null;
      unitPrice: string | null;
    }>;
    orderNumber: string | null;
    paidAt: Date | null;
    paymentStatus: string | null;
    raw: unknown;
    shippingStatus: string | null;
    status: string | null;
    storeId: string;
    tiendanubeOrderId: string;
    total: string | null;
  }>;
  storeId: string;
};

function hashOptionalValue(value: string | null | undefined, options?: { normalizeEmail?: boolean }) {
  if (!value) {
    return null;
  }

  const normalized = options?.normalizeEmail ? value.trim().toLowerCase() : value.trim();

  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export async function upsertProductsWithVariants(input: UpsertProductsInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    let productCount = 0;
    let variantCount = 0;

    for (const product of input.productsToUpsert) {
      const [existingProduct] = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.storeId, input.storeId),
            eq(products.tiendanubeProductId, product.tiendanubeProductId),
          ),
        )
        .limit(1);

      const [savedProduct] = existingProduct
        ? await tx
            .update(products)
            .set({
              handle: product.handle,
              name: product.name,
              published: product.published,
              raw: product.raw,
            })
            .where(eq(products.id, existingProduct.id))
            .returning({ id: products.id })
        : await tx
            .insert(products)
            .values({
              handle: product.handle,
              name: product.name,
              published: product.published,
              raw: product.raw,
              storeId: input.storeId,
              tiendanubeProductId: product.tiendanubeProductId,
            })
            .returning({ id: products.id });

      productCount += 1;

      for (const variant of product.variants) {
        const [existingVariant] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.storeId, input.storeId),
              eq(productVariants.tiendanubeVariantId, variant.tiendanubeVariantId),
            ),
          )
          .limit(1);

        if (existingVariant) {
          await tx
            .update(productVariants)
            .set({
              price: variant.price,
              productId: savedProduct.id,
              raw: variant.raw,
              sku: variant.sku,
              stock: variant.stock,
            })
            .where(eq(productVariants.id, existingVariant.id));
        } else {
          await tx.insert(productVariants).values({
            price: variant.price,
            productId: savedProduct.id,
            raw: variant.raw,
            sku: variant.sku,
            stock: variant.stock,
            storeId: input.storeId,
            tiendanubeVariantId: variant.tiendanubeVariantId,
          });
        }

        variantCount += 1;
      }
    }

    return {
      productCount,
      variantCount,
    };
  });
}

export async function upsertOrdersWithItems(input: UpsertOrdersInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    let customerLinkedCount = 0;
    let itemCount = 0;
    let orderCount = 0;

    const uniqueProductIds = [
      ...new Set(
        input.ordersToUpsert
          .flatMap((order) => order.items.map((item) => item.tiendanubeProductId))
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const uniqueVariantIds = [
      ...new Set(
        input.ordersToUpsert
          .flatMap((order) => order.items.map((item) => item.tiendanubeVariantId))
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const matchedProducts = uniqueProductIds.length
      ? await tx
          .select({
            id: products.id,
            tiendanubeProductId: products.tiendanubeProductId,
          })
          .from(products)
          .where(
            and(
              eq(products.storeId, input.storeId),
              inArray(products.tiendanubeProductId, uniqueProductIds),
            ),
          )
      : [];

    const matchedVariants = uniqueVariantIds.length
      ? await tx
          .select({
            id: productVariants.id,
            tiendanubeVariantId: productVariants.tiendanubeVariantId,
          })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.storeId, input.storeId),
              inArray(productVariants.tiendanubeVariantId, uniqueVariantIds),
            ),
          )
      : [];

    const productIdByExternalId = new Map(matchedProducts.map((product) => [product.tiendanubeProductId, product.id]));
    const variantIdByExternalId = new Map(matchedVariants.map((variant) => [variant.tiendanubeVariantId, variant.id]));

    for (const order of input.ordersToUpsert) {
      let customerId: string | null = null;

      if (order.customer) {
        const [existingCustomer] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.storeId, input.storeId),
              eq(customers.tiendanubeCustomerId, order.customer.tiendanubeCustomerId),
            ),
          )
          .limit(1);

        const customerPayload = {
          emailHash: hashOptionalValue(order.customer.email, { normalizeEmail: true }),
          name: order.customer.name,
          phoneHash: hashOptionalValue(order.customer.phone),
          raw: order.customer.raw,
        };

        const [savedCustomer] = existingCustomer
          ? await tx
              .update(customers)
              .set(customerPayload)
              .where(eq(customers.id, existingCustomer.id))
              .returning({ id: customers.id })
          : await tx
              .insert(customers)
              .values({
                ...customerPayload,
                storeId: input.storeId,
                tiendanubeCustomerId: order.customer.tiendanubeCustomerId,
              })
              .returning({ id: customers.id });

        customerId = savedCustomer.id;
        customerLinkedCount += 1;
      }

      const [existingOrder] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, input.storeId),
            eq(orders.tiendanubeOrderId, order.tiendanubeOrderId),
          ),
        )
        .limit(1);

      const [savedOrder] = existingOrder
        ? await tx
            .update(orders)
            .set({
              cancelledAt: order.cancelledAt,
              createdAtTiendanube: order.createdAtTiendanube,
              currency: order.currency,
              customerId,
              orderNumber: order.orderNumber,
              paidAt: order.paidAt,
              paymentStatus: order.paymentStatus,
              raw: order.raw,
              shippingStatus: order.shippingStatus,
              status: order.status,
              total: order.total,
            })
            .where(eq(orders.id, existingOrder.id))
            .returning({ id: orders.id })
        : await tx
            .insert(orders)
            .values({
              cancelledAt: order.cancelledAt,
              createdAtTiendanube: order.createdAtTiendanube,
              currency: order.currency,
              customerId,
              orderNumber: order.orderNumber,
              paidAt: order.paidAt,
              paymentStatus: order.paymentStatus,
              raw: order.raw,
              shippingStatus: order.shippingStatus,
              status: order.status,
              storeId: input.storeId,
              tiendanubeOrderId: order.tiendanubeOrderId,
              total: order.total,
            })
            .returning({ id: orders.id });

      await tx.delete(orderItems).where(eq(orderItems.orderId, savedOrder.id));

      if (order.items.length > 0) {
        await tx.insert(orderItems).values(
          order.items.map((item) => ({
            orderId: savedOrder.id,
            productId: item.tiendanubeProductId ? (productIdByExternalId.get(item.tiendanubeProductId) ?? null) : null,
            productName: item.productName,
            quantity: item.quantity,
            storeId: input.storeId,
            totalPrice: item.totalPrice,
            unitPrice: item.unitPrice,
            variantId: item.tiendanubeVariantId ? (variantIdByExternalId.get(item.tiendanubeVariantId) ?? null) : null,
          })),
        );
      }

      itemCount += order.items.length;
      orderCount += 1;
    }

    return {
      customerLinkedCount,
      itemCount,
      orderCount,
    };
  });
}

export async function createSyncJob(storeId: string, type: string, metadata?: Record<string, unknown>) {
  const db = getDb();
  const [job] = await db
    .insert(syncJobs)
    .values({
      metadata: metadata ?? null,
      startedAt: new Date(),
      status: "running",
      storeId,
      type,
    })
    .returning({ id: syncJobs.id });

  return job;
}

export async function finishSyncJob(
  jobId: string,
  input: {
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
    status: "failed" | "succeeded";
  },
) {
  const db = getDb();

  await db
    .update(syncJobs)
    .set({
      errorMessage: input.errorMessage ?? null,
      finishedAt: new Date(),
      metadata: input.metadata ?? null,
      status: input.status,
    })
    .where(eq(syncJobs.id, jobId));
}

export async function getDashboardSyncSummary() {
  const connection = await getActiveTiendanubeConnection().catch(() => null);

  if (!connection) {
    return {
      connection: null,
      latestSyncJob: null,
      orderCount: 0,
      productCount: 0,
      variantCount: 0,
    };
  }

  const db = getDb();

  const [latestSyncJob] = await db
    .select({
      errorMessage: syncJobs.errorMessage,
      finishedAt: syncJobs.finishedAt,
      id: syncJobs.id,
      metadata: syncJobs.metadata,
      startedAt: syncJobs.startedAt,
      status: syncJobs.status,
      type: syncJobs.type,
    })
    .from(syncJobs)
    .where(eq(syncJobs.storeId, connection.storeId))
    .orderBy(desc(syncJobs.startedAt))
    .limit(1);

  const syncedProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.storeId, connection.storeId));

  const syncedVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.storeId, connection.storeId));

  const syncedOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.storeId, connection.storeId));

  return {
    connection,
    latestSyncJob: latestSyncJob ?? null,
    orderCount: syncedOrders.length,
    productCount: syncedProducts.length,
    variantCount: syncedVariants.length,
  };
}
