import type {
  TiendanubeProductResponse,
  TiendanubeRateLimitInfo,
} from "@/lib/tiendanube/types";

const DEFAULT_PRODUCTS_PER_PAGE = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;

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

export function getTiendanubeApiBaseUrl(storeId: string) {
  return `${process.env.TIENDANUBE_API_BASE_URL ?? "https://api.tiendanube.com/v1"}/${storeId}`;
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

export async function fetchAllTiendanubeProducts(storeId: string, accessToken: string) {
  const products: TiendanubeProductResponse[] = [];
  let page = 1;
  let nextUrl: string | null = new URL(`${getTiendanubeApiBaseUrl(storeId)}/products`).toString();
  let lastBatchSize = 0;
  let totalCountHeader: number | null = null;
  let lastRateLimit: TiendanubeRateLimitInfo = {
    limit: null,
    remaining: null,
    resetMs: null,
  };
  const visitedPages: Array<{
    batchSize: number;
    page: number;
    totalCountHeader: number | null;
    url: string;
  }> = [];

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (!url.searchParams.has("page")) {
      url.searchParams.set("page", String(page));
    }

    if (!url.searchParams.has("per_page")) {
      url.searchParams.set("per_page", String(DEFAULT_PRODUCTS_PER_PAGE));
    }

    if (!url.searchParams.has("fields")) {
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
      nextUrl = new URL(
        `${getTiendanubeApiBaseUrl(storeId)}/products?page=${page}&per_page=${DEFAULT_PRODUCTS_PER_PAGE}&fields=id,name,handle,published,variants`,
      ).toString();
    }
  }

  return {
    products,
    totalCountHeader,
    rateLimit: lastRateLimit,
    visitedPages,
  };
}
