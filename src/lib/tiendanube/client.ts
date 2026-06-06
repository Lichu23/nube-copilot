import type {
  TiendanubeOrderResponse,
  TiendanubeProductResponse,
  TiendanubeProductSource,
  TiendanubeRateLimitInfo,
} from "@/lib/tiendanube/types";

const DEFAULT_PRODUCTS_PER_PAGE = 100;
const DEFAULT_ORDERS_PER_PAGE = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;
const FALLBACK_PRODUCT_API_VERSION = "2025-03";

type FetchedProductsPage = {
  batchSize: number;
  page: number;
  totalCountHeader: number | null;
  url: string;
};

type ProductFetchResult = {
  apiVersion: TiendanubeProductSource;
  products: TiendanubeProductResponse[];
  rateLimit: TiendanubeRateLimitInfo;
  totalCountHeader: number | null;
  visitedPages: FetchedProductsPage[];
};

type FetchedOrdersPage = {
  batchSize: number;
  page: number;
  totalCountHeader: number | null;
  url: string;
};

type OrderFetchResult = {
  orders: TiendanubeOrderResponse[];
  rateLimit: TiendanubeRateLimitInfo;
  totalCountHeader: number | null;
  visitedPages: FetchedOrdersPage[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumberHeader(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTotalCount(headers: Headers) {
  return parseNumberHeader(headers.get("x-total-count"));
}

function getRateLimitInfo(headers: Headers): TiendanubeRateLimitInfo {
  return {
    limit: parseNumberHeader(headers.get("x-rate-limit-limit")),
    remaining: parseNumberHeader(headers.get("x-rate-limit-remaining")),
    resetMs: parseNumberHeader(headers.get("x-rate-limit-reset")),
  };
}

function getRetryDelayMs(headers: Headers, attempt: number) {
  const resetMs = getRateLimitInfo(headers).resetMs;

  if (resetMs && resetMs > 0) {
    return Math.min(resetMs, 10_000);
  }

  return Math.min(500 * 2 ** attempt, 5_000);
}

function getNextLink(linkHeader: string | null) {
  if (!linkHeader) {
    return null;
  }

  const nextEntry = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'));

  return nextEntry?.match(/<([^>]+)>/)?.[1] ?? null;
}

function getApiOrigin() {
  const baseUrl = process.env.TIENDANUBE_API_BASE_URL?.trim();

  if (!baseUrl) {
    return "https://api.tiendanube.com";
  }

  const parsed = new URL(baseUrl);
  return parsed.origin;
}

export function getTiendanubeApiBaseUrl(storeId: string, version: TiendanubeProductSource = "v1") {
  const apiOrigin = getApiOrigin();
  const versionSegment = version === "v1" ? "v1" : FALLBACK_PRODUCT_API_VERSION;

  return `${apiOrigin}/${versionSegment}/${storeId}`;
}

export function getTiendanubeApiHeaders(accessToken: string) {
  const contactUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  return {
    Authentication: `bearer ${accessToken}`,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": `Tiendanube AI Business Analyst (${contactUrl})`,
  };
}

export async function tiendanubeFetch<T>(
  url: string | URL,
  accessToken: string,
  init?: RequestInit,
  attempt = 0,
): Promise<{ data: T; headers: Headers; rateLimit: TiendanubeRateLimitInfo }> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...getTiendanubeApiHeaders(accessToken),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 429 && attempt < DEFAULT_RETRY_ATTEMPTS) {
    await sleep(getRetryDelayMs(response.headers, attempt));
    return tiendanubeFetch<T>(url, accessToken, init, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Tiendanube API request failed with status ${response.status}.`);
  }

  return {
    data: (await response.json()) as T,
    headers: response.headers,
    rateLimit: getRateLimitInfo(response.headers),
  };
}

async function fetchProductsForVersion(
  storeId: string,
  accessToken: string,
  apiVersion: TiendanubeProductSource,
): Promise<ProductFetchResult> {
  const products: TiendanubeProductResponse[] = [];
  let page = 1;
  let nextUrl: string | null = new URL(`${getTiendanubeApiBaseUrl(storeId, apiVersion)}/products`).toString();
  let lastBatchSize = 0;
  let totalCountHeader: number | null = null;
  let lastRateLimit: TiendanubeRateLimitInfo = {
    limit: null,
    remaining: null,
    resetMs: null,
  };
  const visitedPages: FetchedProductsPage[] = [];

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (!url.searchParams.has("page")) {
      url.searchParams.set("page", String(page));
    }

    if (!url.searchParams.has("per_page")) {
      url.searchParams.set("per_page", String(DEFAULT_PRODUCTS_PER_PAGE));
    }

    if (apiVersion === "v1" && !url.searchParams.has("fields")) {
      url.searchParams.set("fields", "id,name,handle,published,variants");
    }

    const { data, headers, rateLimit } = await tiendanubeFetch<TiendanubeProductResponse[]>(url, accessToken);
    products.push(...data);
    lastBatchSize = data.length;
    lastRateLimit = rateLimit;
    totalCountHeader = parseTotalCount(headers);
    visitedPages.push({
      batchSize: data.length,
      page,
      totalCountHeader,
      url: url.toString(),
    });

    console.info("[tiendanube-sync] fetched products page", {
      apiVersion,
      batchSize: data.length,
      page,
      rateLimit,
      storeId,
      totalCountHeader,
      url: url.toString(),
    });

    nextUrl = getNextLink(headers.get("link"));
    page += 1;

    if (!nextUrl && lastBatchSize === DEFAULT_PRODUCTS_PER_PAGE) {
      const followUpUrl = new URL(`${getTiendanubeApiBaseUrl(storeId, apiVersion)}/products`);
      followUpUrl.searchParams.set("page", String(page));
      followUpUrl.searchParams.set("per_page", String(DEFAULT_PRODUCTS_PER_PAGE));

      if (apiVersion === "v1") {
        followUpUrl.searchParams.set("fields", "id,name,handle,published,variants");
      }

      nextUrl = followUpUrl.toString();
    }
  }

  return {
    apiVersion,
    products,
    rateLimit: lastRateLimit,
    totalCountHeader,
    visitedPages,
  };
}

export async function fetchAllTiendanubeProducts(storeId: string, accessToken: string) {
  const primaryResult = await fetchProductsForVersion(storeId, accessToken, "v1");

  if (primaryResult.totalCountHeader === 0 && primaryResult.products.length === 0) {
    console.info("[tiendanube-sync] falling back to newer product api", {
      fallbackVersion: FALLBACK_PRODUCT_API_VERSION,
      storeId,
      v1TotalCountHeader: primaryResult.totalCountHeader,
    });

    const fallbackResult = await fetchProductsForVersion(storeId, accessToken, "2025-03");

    return fallbackResult;
  }

  return primaryResult;
}

type FetchAllTiendanubeOrdersInput = {
  createdAtMin?: string;
};

export async function fetchAllTiendanubeOrders(
  storeId: string,
  accessToken: string,
  input: FetchAllTiendanubeOrdersInput = {},
): Promise<OrderFetchResult> {
  const orders: TiendanubeOrderResponse[] = [];
  let page = 1;
  let nextUrl: string | null = new URL(`${getTiendanubeApiBaseUrl(storeId)}/orders`).toString();
  let lastBatchSize = 0;
  let totalCountHeader: number | null = null;
  let lastRateLimit: TiendanubeRateLimitInfo = {
    limit: null,
    remaining: null,
    resetMs: null,
  };
  const visitedPages: FetchedOrdersPage[] = [];

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (!url.searchParams.has("page")) {
      url.searchParams.set("page", String(page));
    }

    if (!url.searchParams.has("per_page")) {
      url.searchParams.set("per_page", String(DEFAULT_ORDERS_PER_PAGE));
    }

    if (input.createdAtMin && !url.searchParams.has("created_at_min")) {
      url.searchParams.set("created_at_min", input.createdAtMin);
    }

    if (!url.searchParams.has("fields")) {
      url.searchParams.set(
        "fields",
        [
          "id",
          "number",
          "status",
          "payment_status",
          "shipping_status",
          "total",
          "currency",
          "created_at",
          "paid_at",
          "cancelled_at",
          "contact_name",
          "contact_email",
          "contact_phone",
          "customer",
          "products",
        ].join(","),
      );
    }

    const { data, headers, rateLimit } = await tiendanubeFetch<TiendanubeOrderResponse[]>(url, accessToken);
    orders.push(...data);
    lastBatchSize = data.length;
    lastRateLimit = rateLimit;
    totalCountHeader = parseTotalCount(headers);
    visitedPages.push({
      batchSize: data.length,
      page,
      totalCountHeader,
      url: url.toString(),
    });

    console.info("[tiendanube-sync] fetched orders page", {
      batchSize: data.length,
      page,
      rateLimit,
      storeId,
      totalCountHeader,
      url: url.toString(),
    });

    nextUrl = getNextLink(headers.get("link"));
    page += 1;

    if (!nextUrl && lastBatchSize === DEFAULT_ORDERS_PER_PAGE) {
      const followUpUrl = new URL(`${getTiendanubeApiBaseUrl(storeId)}/orders`);
      followUpUrl.searchParams.set("page", String(page));
      followUpUrl.searchParams.set("per_page", String(DEFAULT_ORDERS_PER_PAGE));

      if (input.createdAtMin) {
        followUpUrl.searchParams.set("created_at_min", input.createdAtMin);
      }

      followUpUrl.searchParams.set(
        "fields",
        [
          "id",
          "number",
          "status",
          "payment_status",
          "shipping_status",
          "total",
          "currency",
          "created_at",
          "paid_at",
          "cancelled_at",
          "contact_name",
          "contact_email",
          "contact_phone",
          "customer",
          "products",
        ].join(","),
      );

      nextUrl = followUpUrl.toString();
    }
  }

  return {
    orders,
    rateLimit: lastRateLimit,
    totalCountHeader,
    visitedPages,
  };
}
