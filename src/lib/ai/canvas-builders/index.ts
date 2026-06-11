import type { AnalystResponse, CanvasModel } from "@/lib/types";
import { buildComparePeriodsCanvas } from "./compare-periods";
import { buildDefaultCanvasModel, getPrimaryToolResult } from "./helpers";
import { buildLowStockCanvas } from "./low-stock";
import { buildSalesSummaryCanvas } from "./sales-summary";
import { buildTopProductsCanvas } from "./top-products";
import { buildWeeklySnapshotCanvas } from "./weekly-snapshot";

export function buildCanvasModel(result: AnalystResponse | null, userQuestion: string): CanvasModel | null {
  if (!result) return null;

  const primary = getPrimaryToolResult(result.toolResults);
  if (!primary) return null;

  switch (primary.toolName) {
    case "compare_periods":
      return buildComparePeriodsCanvas(result, primary, userQuestion);
    case "get_sales_summary":
      return buildSalesSummaryCanvas(result, primary, userQuestion);
    case "get_top_products":
      return buildTopProductsCanvas(result, primary, userQuestion);
    case "get_weekly_business_snapshot":
      return buildWeeklySnapshotCanvas(result, primary, userQuestion);
    case "get_low_stock_opportunities":
      return buildLowStockCanvas(result, primary, userQuestion);
    default:
      return buildDefaultCanvasModel(result, primary, userQuestion);
  }
}
