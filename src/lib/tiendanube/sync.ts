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
    const { products, rateLimit, totalCountHeader, visitedPages } = await fetchAllTiendanubeProducts(
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
        price: variant.price == null ? null : String(variant.price),
        raw: variant,
        sku: variant.sku ?? null,
        stock: variant.stock ?? null,
        tiendanubeVariantId: String(variant.id),
      })),
    }));

    const persisted = await upsertProductsWithVariants({
      productsToUpsert: normalizedProducts,
      storeId: connection.storeId,
    });

    const metadata = {
      productCount: persisted.productCount,
      rateLimit,
      responsePreview: normalizedProducts.slice(0, 3).map((product) => ({
        name: product.name,
        tiendanubeProductId: product.tiendanubeProductId,
        variantCount: product.variants.length,
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
