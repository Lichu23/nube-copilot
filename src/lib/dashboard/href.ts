import type { CompareWindowKey } from "./config";

export function buildDashboardHref(
  compareWindow: CompareWindowKey,
  asOf: string | null,
  storeId?: string | null,
) {
  const searchParams = new URLSearchParams({ compareWindow });

  if (asOf) {
    searchParams.set("asOf", asOf);
  }

  if (storeId) {
    searchParams.set("storeId", storeId);
  }

  return `/dashboard?${searchParams.toString()}`;
}
