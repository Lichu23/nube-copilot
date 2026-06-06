import {
  createSyncJob,
  finishSyncJob,
  getActiveTiendanubeConnection,
  upsertProductsWithVariants,
} from "@/lib/db/client";
import { getTiendanubeOAuthConfig } from "@/lib/env/tiendanube";
import { decryptSecret } from "@/lib/security/encryption";
import { fetchAllTiendanubeProducts } from "@/lib/tiendanube/client";
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

    const metadata = {
      apiVersion,
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
      message: "Initial Tiendanube product sync completed.",
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
      message: "Initial Tiendanube product sync failed.",
      ok: false,
      status: 500,
    };
  }
}
