import type { AnalystResponse, CanvasModel } from "@/lib/types";
import { buildComparePeriodsCanvas } from "./compare-periods";
import { asNumber, asRecord, buildDefaultCanvasModel, buildSuggestedQuestions, getPrimaryToolResult } from "./helpers";
import { buildLowStockCanvas } from "./low-stock";
import { buildSalesSummaryCanvas } from "./sales-summary";
import { buildTopProductsCanvas } from "./top-products";
import { buildWeeklySnapshotCanvas } from "./weekly-snapshot";

export function buildCanvasModel(result: AnalystResponse | null, userQuestion: string): CanvasModel | null {
  if (!result) return null;

  const primary = getPrimaryToolResult(result.toolResults);
  if (!primary) return null;

  let model: CanvasModel | null;

  switch (primary.toolName) {
    case "compare_periods":
      model = buildComparePeriodsCanvas(result, primary, userQuestion);
      break;
    case "get_sales_summary":
      model = buildSalesSummaryCanvas(result, primary, userQuestion);
      break;
    case "get_top_products":
      model = buildTopProductsCanvas(result, primary, userQuestion);
      break;
    case "get_weekly_business_snapshot":
      model = buildWeeklySnapshotCanvas(result, primary, userQuestion);
      break;
    case "get_low_stock_opportunities":
      model = buildLowStockCanvas(result, primary, userQuestion);
      break;
    default:
      model = buildDefaultCanvasModel(result, primary, userQuestion);
  }

  if (!model) return null;

  const output = asRecord(primary.output);
  const window = asRecord(output?.window);
  const days = asNumber(window?.days) ?? asNumber(window?.recentDays) ?? undefined;

  return {
    ...model,
    suggestedQuestions: buildSuggestedQuestions(primary.toolName, { days }),
  };
}
