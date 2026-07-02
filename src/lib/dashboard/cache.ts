import { unstable_cache } from "next/cache";

import { getCompareWindow, getDashboardData, parseAsOfDate } from "@/lib/dashboard/data-transformer";
import type { CompareWindowKey } from "@/lib/dashboard/config";
import { getDashboardSyncSummary } from "@/lib/db/client";

export const DASHBOARD_CACHE_TTL_SECONDS = 300;
export const SIDEBAR_CACHE_TTL_SECONDS = 300;

export function getSidebarCacheTag(storeId: string) {
  return `store:${storeId}:sidebar`;
}

export function getDashboardCacheTag(storeId: string) {
  return `store:${storeId}:dashboard`;
}

export function getDashboardCacheKey(input: {
  asOfKey: string;
  compareWindow: CompareWindowKey;
  storeId: string;
}) {
  return `store:${input.storeId}:dashboard:${input.compareWindow}:${input.asOfKey}`;
}

export async function getCachedDashboardSyncSummary(storeId: string) {
  return unstable_cache(
    () => getDashboardSyncSummary(storeId),
    [`store:${storeId}:sidebar-summary`],
    {
      revalidate: SIDEBAR_CACHE_TTL_SECONDS,
      tags: [getSidebarCacheTag(storeId)],
    },
  )();
}

export async function getCachedDashboardPayload(input: {
  asOf: string | string[] | undefined;
  compareWindow: string | string[] | undefined;
  isDevOverrideEnabled: boolean;
  storeId: string;
}) {
  const compareWindow = getCompareWindow(input.compareWindow);
  const asOfOverride = input.isDevOverrideEnabled ? parseAsOfDate(input.asOf) : null;
  const endDate = asOfOverride ?? new Date();
  const asOfKey = (input.isDevOverrideEnabled && asOfOverride ? asOfOverride : endDate).toISOString().slice(0, 10);
  const cacheKey = getDashboardCacheKey({ asOfKey, compareWindow, storeId: input.storeId });

  return unstable_cache(
    async () => {
      const summary = await getDashboardSyncSummary(input.storeId);
      const data = await getDashboardData({ compareWindow, endDate, summary });

      return {
        compareWindow,
        data,
        endDate: endDate.toISOString(),
        summary,
      };
    },
    [cacheKey],
    {
      revalidate: DASHBOARD_CACHE_TTL_SECONDS,
      tags: [getDashboardCacheTag(input.storeId)],
    },
  )();
}
