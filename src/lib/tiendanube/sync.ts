import {
  createSyncJob,
  finishSyncJob,
  getActiveTiendanubeConnection,
  upsertOrdersWithItems,
  upsertProductsWithVariants,
} from "@/lib/db/client";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { decryptSecret } from "@/lib/security/encryption";
import { fetchAllTiendanubeOrders, fetchAllTiendanubeProducts } from "@/lib/tiendanube/client";
import { getLocalizedValue } from "@/lib/tiendanube/types";

type RunInitialSyncInput = {
  storeId?: string;
};

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

export async function runInitialSync(input: RunInitialSyncInput = {}) {
  const connection = await getActiveTiendanubeConnection(input.storeId);

  if (!connection) {
    return {
      message: "No active Tiendanube store connection was found.",
      ok: false,
      status: 404,
    };
  }

  const encryptionSecret = getTiendanubeOAuthConfig({ requireEncryptionSecret: true }).encryptionSecret!;
  const accessToken = decryptSecret(connection.accessTokenEncrypted, encryptionSecret);
  const syncJob = await createSyncJob(connection.storeId, "initial", {
    storeExternalId: connection.storeExternalId,
    storeName: connection.storeName,
  });

  console.info("[tiendanube-sync] starting initial sync", {
    jobId: syncJob.id,
    requestedStoreId: input.storeId ?? null,
    resolvedStoreExternalId: connection.storeExternalId,
    resolvedStoreId: connection.storeId,
    storeName: connection.storeName,
  });

  try {
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

    console.info("[tiendanube-sync] persisted products", {
      apiVersion,
      jobId: syncJob.id,
      persistedProductCount: persisted.productCount,
      persistedVariantCount: persisted.variantCount,
      productPages: visitedPages.length,
      storeId: connection.storeId,
      totalCountHeader,
    });

    const metadata: Record<string, unknown> = {
      apiVersion,
      customerLinkedCount: 0,
      productCount: persisted.productCount,
      rateLimit,
      responsePreview: normalizedProducts.slice(0, 3).map((product) => ({
        name: product.name,
        tiendanubeProductId: product.tiendanubeProductId,
        variantCount: product.variants.length,
        variantStocks: product.variants.map((variant) => variant.stock),
      })),
      totalCountHeader,
      variantCount: persisted.variantCount,
      visitedPages,
    };

    try {
      const ordersCreatedAtMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      console.info("[tiendanube-sync] fetching orders", {
        createdAtMin: ordersCreatedAtMin,
        jobId: syncJob.id,
        storeExternalId: connection.storeExternalId,
        storeId: connection.storeId,
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
          const computedTotal =
            unitPrice && quantity > 0 ? String(Number(unitPrice) * quantity) : unitPrice;

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

      console.info("[tiendanube-sync] persisted orders", {
        fetchedOrderCount: normalizedOrders.length,
        jobId: syncJob.id,
        orderCount: persistedOrders.orderCount,
        customerLinkedCount: persistedOrders.customerLinkedCount,
        itemCount: persistedOrders.itemCount,
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

      console.error("[tiendanube-sync] initial sync partially failed", {
        error: message,
        jobId: syncJob.id,
        storeExternalId: connection.storeExternalId,
        storeId: connection.storeId,
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
        message: "Sincronización parcial: guardamos productos, pero falló la lectura de pedidos.",
        ok: true,
        status: 200,
        warning: message,
      };
    }

    console.info("[tiendanube-sync] completed initial sync", {
      jobId: syncJob.id,
      metadata,
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
      message: "Initial Tiendanube catalog and orders sync completed.",
      ok: true,
      status: 200,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error.";

    console.error("[tiendanube-sync] initial sync failed", {
      error: message,
      jobId: syncJob.id,
      storeExternalId: connection.storeExternalId,
      storeId: connection.storeId,
    });

    await finishSyncJob(syncJob.id, {
      errorMessage: message,
      metadata: {
        storeExternalId: connection.storeExternalId,
      },
      status: "failed",
    });

    return {
      error: message,
      jobId: syncJob.id,
      message: "Initial Tiendanube catalog and orders sync failed.",
      ok: false,
      status: 500,
    };
  }
}
