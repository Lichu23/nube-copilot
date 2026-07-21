import {
  createSyncJob,
  finishSyncJob,
  getActiveTiendanubeConnection,
  getRunningSyncJob,
  getSyncState,
  upsertOrdersWithItems,
  upsertProductsWithVariants,
  upsertSyncState,
} from "@/lib/db/client";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { decryptSecret } from "@/lib/security/encryption";
import { fetchAllTiendanubeOrders, fetchAllTiendanubeProducts } from "@/lib/tiendanube/client";
import { getLocalizedValue } from "@/lib/tiendanube/types";

type RunInitialSyncInput = {
  existingJobId?: string;
  storeId?: string;
};

export type SyncMode = "initial" | "incremental";

const INITIAL_ORDERS_LOOKBACK_DAYS = 90;
const INCREMENTAL_OVERLAP_MINUTES = 10;

function getVariantStock(variant: {
  inventory_levels?: Array<{ stock?: number | null }> | null;
  stock?: number | null;
}) {
  if (typeof variant.stock === "number") {
    return variant.stock;
  }

  if (!variant.inventory_levels?.length) {
    return null;
  }

  const inventoryStocks = variant.inventory_levels
    .map((level) => level.stock)
    .filter((stock): stock is number => typeof stock === "number");

  if (inventoryStocks.length === 0) {
    return null;
  }

  return inventoryStocks.reduce((total, stock) => total + stock, 0);
}

function getDateOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNumericString(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  return String(value);
}

function getQuantity(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getIncrementalStart(lastSyncedAt: Date) {
  return new Date(lastSyncedAt.getTime() - INCREMENTAL_OVERLAP_MINUTES * 60 * 1000);
}

function getInitialOrdersStart() {
  return new Date(Date.now() - INITIAL_ORDERS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
}

export async function runInitialSync(input: RunInitialSyncInput = {}) {
  const connection = await getActiveTiendanubeConnection(input.storeId);

  if (!connection) {
    return {
      message: "No active Tiendanube store connection was found.",
      ok: false,
      status: 404,
    };
  }

  const [productState, orderState] = await Promise.all([
    getSyncState(connection.storeId, "products"),
    getSyncState(connection.storeId, "orders"),
  ]);
  const syncMode: SyncMode = productState?.lastSyncedAt && orderState?.lastSyncedAt ? "incremental" : "initial";
  const runningJob = input.existingJobId ? null : await getRunningSyncJob(connection.storeId);

  if (runningJob) {
    console.info("[tiendanube-sync] skipped duplicate sync request", {
      existingJobId: runningJob.id,
      existingJobStartedAt: runningJob.startedAt?.toISOString() ?? null,
      existingJobType: runningJob.type,
      requestedStoreId: input.storeId ?? null,
      resolvedStoreId: connection.storeId,
      syncMode,
    });

    return {
      data: {
        existingJobId: runningJob.id,
        existingJobStartedAt: runningJob.startedAt?.toISOString() ?? null,
        existingJobType: runningJob.type,
        storeId: connection.storeId,
        storeName: connection.storeName,
        syncMode,
      },
      jobId: runningJob.id,
      message: "Ya hay una sincronización en curso. Esperá a que termine antes de iniciar otra.",
      ok: true,
      status: 202,
      syncMode,
    };
  }

  const syncStartedAt = new Date();
  const encryptionSecret = getTiendanubeOAuthConfig({ requireEncryptionSecret: true }).encryptionSecret!;
  const accessToken = decryptSecret(connection.accessTokenEncrypted, encryptionSecret);
  const syncJob = input.existingJobId
    ? { id: input.existingJobId }
    : await createSyncJob(connection.storeId, syncMode, {
        previousOrdersSyncedAt: orderState?.lastSyncedAt?.toISOString() ?? null,
        previousProductsSyncedAt: productState?.lastSyncedAt?.toISOString() ?? null,
        storeExternalId: connection.storeExternalId,
        storeName: connection.storeName,
        syncMode,
      });

  console.info("[tiendanube-sync] starting sync", {
    jobId: syncJob.id,
    requestedStoreId: input.storeId ?? null,
    resolvedStoreExternalId: connection.storeExternalId,
    resolvedStoreId: connection.storeId,
    storeName: connection.storeName,
    syncMode,
  });

  try {
    const metadata: Record<string, unknown> = {
      customerLinkedCount: 0,
      initialOrdersLookbackDays: INITIAL_ORDERS_LOOKBACK_DAYS,
      incrementalOverlapMinutes: INCREMENTAL_OVERLAP_MINUTES,
      previousOrdersSyncedAt: orderState?.lastSyncedAt?.toISOString() ?? null,
      previousProductsSyncedAt: productState?.lastSyncedAt?.toISOString() ?? null,
      syncMode,
    };

    if (syncMode === "initial") {
      console.info("[tiendanube-sync] fetching products", {
        jobId: syncJob.id,
        storeExternalId: connection.storeExternalId,
        storeId: connection.storeId,
      });

      const { apiVersion, products, rateLimit, totalCountHeader, visitedPages } = await fetchAllTiendanubeProducts(
        connection.storeExternalId,
        accessToken,
      );

      const normalizedProducts = products.map((product) => ({
        handle: getLocalizedValue(product.handle ?? null),
        name: getLocalizedValue(product.name ?? null),
        published: product.published ?? null,
        raw: product,
        tiendanubeProductId: String(product.id),
        variants: (product.variants ?? []).map((variant) => ({
          inventoryLevels: variant.inventory_levels?.length ?? 0,
          price: variant.price == null ? null : String(variant.price),
          raw: variant,
          sku: variant.sku ?? null,
          stock: getVariantStock(variant),
          tiendanubeVariantId: String(variant.id),
        })),
      }));

      const persisted = await upsertProductsWithVariants({
        productsToUpsert: normalizedProducts,
        storeId: connection.storeId,
      });

      await upsertSyncState({
        lastSyncedAt: syncStartedAt,
        resource: "products",
        storeId: connection.storeId,
      });

      console.info("[tiendanube-sync] persisted products", {
        apiVersion,
        jobId: syncJob.id,
        persistedProductCount: persisted.productCount,
        persistedVariantCount: persisted.variantCount,
        productPages: visitedPages.length,
        storeId: connection.storeId,
        totalCountHeader,
      });

      metadata.apiVersion = apiVersion;
      metadata.productCount = persisted.productCount;
      metadata.productsRateLimit = rateLimit;
      metadata.productsResponsePreview = normalizedProducts.slice(0, 3).map((product) => ({
        name: product.name,
        tiendanubeProductId: product.tiendanubeProductId,
        variantCount: product.variants.length,
        variantStocks: product.variants.map((variant) => variant.stock),
      }));
      metadata.productsTotalCountHeader = totalCountHeader;
      metadata.variantCount = persisted.variantCount;
      metadata.visitedProductPages = visitedPages;
    } else {
      metadata.productsSkipped = true;
      metadata.productsSkipReason = "Incremental sync skips the full catalog import to avoid repeating expensive unchanged work.";
    }

    try {
      const ordersCreatedAtMin = (orderState?.lastSyncedAt
        ? getIncrementalStart(orderState.lastSyncedAt)
        : getInitialOrdersStart()
      ).toISOString();

      console.info("[tiendanube-sync] fetching orders", {
        createdAtMin: ordersCreatedAtMin,
        jobId: syncJob.id,
        storeExternalId: connection.storeExternalId,
        storeId: connection.storeId,
        syncMode,
      });

      const {
        orders,
        rateLimit: ordersRateLimit,
        totalCountHeader: ordersTotalCountHeader,
        visitedPages: visitedOrderPages,
      } = await fetchAllTiendanubeOrders(connection.storeExternalId, accessToken, {
        createdAtMin: ordersCreatedAtMin,
      });

      const normalizedOrders = orders.map((order) => ({
        cancelledAt: getDateOrNull(order.cancelled_at),
        createdAtTiendanube: getDateOrNull(order.created_at),
        currency: order.currency ?? null,
        customer: order.customer?.id
          ? {
              email: order.customer.email ?? order.contact_email ?? null,
              name: order.customer.name ?? order.contact_name ?? null,
              phone: order.customer.phone ?? order.contact_phone ?? null,
              raw: order.customer,
              tiendanubeCustomerId: String(order.customer.id),
            }
          : null,
        items: (order.products ?? []).map((item) => {
          const quantity = getQuantity(item.quantity);
          const unitPrice = getNumericString(item.price);
          const computedTotal = unitPrice && quantity > 0 ? String(Number(unitPrice) * quantity) : unitPrice;

          return {
            productName: item.name ?? null,
            quantity,
            tiendanubeProductId: item.product_id == null ? null : String(item.product_id),
            tiendanubeVariantId: item.variant_id == null ? null : String(item.variant_id),
            totalPrice: computedTotal,
            unitPrice,
          };
        }),
        orderNumber: order.number == null ? null : String(order.number),
        paidAt: getDateOrNull(order.paid_at),
        paymentStatus: order.payment_status ?? null,
        raw: order,
        shippingStatus: order.shipping_status ?? null,
        status: order.status ?? null,
        storeId: connection.storeId,
        tiendanubeOrderId: String(order.id),
        total: getNumericString(order.total),
      }));

      const persistedOrders = await upsertOrdersWithItems({
        ordersToUpsert: normalizedOrders,
        storeId: connection.storeId,
      });

      await upsertSyncState({
        lastSyncedAt: syncStartedAt,
        resource: "orders",
        storeId: connection.storeId,
      });

      console.info("[tiendanube-sync] persisted orders", {
        customerLinkedCount: persistedOrders.customerLinkedCount,
        fetchedOrderCount: normalizedOrders.length,
        itemCount: persistedOrders.itemCount,
        jobId: syncJob.id,
        orderCount: persistedOrders.orderCount,
        orderPages: visitedOrderPages.length,
        storeId: connection.storeId,
        totalCountHeader: ordersTotalCountHeader,
      });

      metadata.customerLinkedCount = persistedOrders.customerLinkedCount;
      metadata.itemCount = persistedOrders.itemCount;
      metadata.orderCount = persistedOrders.orderCount;
      metadata.ordersCreatedAtMin = ordersCreatedAtMin;
      metadata.ordersRateLimit = ordersRateLimit;
      metadata.visitedOrderPages = visitedOrderPages;
      metadata.ordersResponsePreview = normalizedOrders.slice(0, 3).map((order) => ({
        itemCount: order.items.length,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
        tiendanubeOrderId: order.tiendanubeOrderId,
      }));
      metadata.ordersTotalCountHeader = ordersTotalCountHeader;
      metadata.syncOutcome = "succeeded";

      if (normalizedOrders.length === 0) {
        console.info("[tiendanube-sync] orders fetch returned no rows", {
          jobId: syncJob.id,
          storeId: connection.storeId,
          visitedOrderPages,
        });
      }

      if (persistedOrders.orderCount !== normalizedOrders.length) {
        console.warn("[tiendanube-sync] order persist count mismatch", {
          fetchedOrderCount: normalizedOrders.length,
          jobId: syncJob.id,
          persistedOrderCount: persistedOrders.orderCount,
          storeId: connection.storeId,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error.";

      metadata.syncOutcome = "partial";
      metadata.partialErrorMessage = message;
      metadata.partialStage = "orders";

      console.error("[tiendanube-sync] sync partially failed", {
        error: message,
        jobId: syncJob.id,
        storeExternalId: connection.storeExternalId,
        storeId: connection.storeId,
        syncMode,
      });

      await finishSyncJob(syncJob.id, {
        errorMessage: message,
        metadata,
        status: "failed",
      });

      return {
        data: {
          ...metadata,
          storeId: connection.storeId,
          storeName: connection.storeName,
        },
        jobId: syncJob.id,
        message:
          syncMode === "initial"
            ? "Sincronización parcial: guardamos productos, pero falló la lectura de pedidos."
            : "Sincronización incremental parcial: falló la lectura de pedidos recientes.",
        ok: true,
        status: 200,
        syncMode,
        warning: message,
      };
    }

    console.info("[tiendanube-sync] completed sync", {
      jobId: syncJob.id,
      metadata,
      syncMode,
    });

    await finishSyncJob(syncJob.id, {
      metadata,
      status: "succeeded",
    });

    return {
      data: {
        ...metadata,
        storeId: connection.storeId,
        storeName: connection.storeName,
      },
      jobId: syncJob.id,
      message:
        syncMode === "initial"
          ? "Sincronización inicial de catálogo y pedidos completada."
          : "Sincronización incremental completada.",
      ok: true,
      status: 200,
      syncMode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error.";

    console.error("[tiendanube-sync] sync failed", {
      error: message,
      jobId: syncJob.id,
      storeExternalId: connection.storeExternalId,
      storeId: connection.storeId,
      syncMode,
    });

    await finishSyncJob(syncJob.id, {
      errorMessage: message,
      metadata: {
        storeExternalId: connection.storeExternalId,
        syncMode,
      },
      status: "failed",
    });

    return {
      error: message,
      jobId: syncJob.id,
      message:
        syncMode === "initial"
          ? "Falló la sincronización inicial de Tiendanube."
          : "Falló la sincronización incremental de Tiendanube.",
      ok: false,
      status: 500,
      syncMode,
    };
  }
}

export async function startTiendanubeSync(input: RunInitialSyncInput = {}) {
  const connection = await getActiveTiendanubeConnection(input.storeId);

  if (!connection) {
    return {
      message: "No active Tiendanube store connection was found.",
      ok: false,
      status: 404,
    };
  }

  const [productState, orderState] = await Promise.all([
    getSyncState(connection.storeId, "products"),
    getSyncState(connection.storeId, "orders"),
  ]);
  const syncMode: SyncMode = productState?.lastSyncedAt && orderState?.lastSyncedAt ? "incremental" : "initial";
  const runningJob = await getRunningSyncJob(connection.storeId);

  if (runningJob) {
    return {
      data: {
        existingJobId: runningJob.id,
        existingJobStartedAt: runningJob.startedAt?.toISOString() ?? null,
        existingJobType: runningJob.type,
        storeId: connection.storeId,
        storeName: connection.storeName,
        syncMode,
      },
      jobId: runningJob.id,
      message: "Ya hay una sincronización en curso. Esperá a que termine antes de iniciar otra.",
      ok: true,
      status: 202,
      syncMode,
    };
  }

  const syncJob = await createSyncJob(connection.storeId, syncMode, {
    previousOrdersSyncedAt: orderState?.lastSyncedAt?.toISOString() ?? null,
    previousProductsSyncedAt: productState?.lastSyncedAt?.toISOString() ?? null,
    storeExternalId: connection.storeExternalId,
    storeName: connection.storeName,
    syncMode,
  });

  return {
    data: {
      storeId: connection.storeId,
      storeName: connection.storeName,
      syncMode,
    },
    jobId: syncJob.id,
    message:
      syncMode === "initial"
        ? "Sincronización inicial iniciada. Podés seguir usando la app mientras termina."
        : "Sincronización incremental iniciada. Estamos actualizando los pedidos recientes.",
    ok: true,
    status: 202,
    syncMode,
  };
}
