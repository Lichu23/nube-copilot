import type { AnalystResponse, CanvasModel } from "@/lib/types";
import { buildAverageOrderValueCanvas } from "./average-order-value";
import { buildComparePeriodsCanvas } from "./compare-periods";
import { asNumber, asRecord, buildDefaultCanvasModel, buildSuggestedQuestions, getPrimaryToolResult } from "./helpers";
import { buildDailySalesTrendCanvas } from "./daily-sales-trend";
import { buildLowStockCanvas } from "./low-stock";
import { buildNextWeekPrioritiesCanvas } from "./next-week-priorities";
import { buildMonthlyTrendCanvas } from "./monthly-trend";
import { buildSalesSummaryCanvas } from "./sales-summary";
import { buildTopProductsCanvas } from "./top-products";
import { buildWeeklySnapshotCanvas } from "./weekly-snapshot";

function shouldUseCompactVisualization(toolName: string, userQuestion: string) {
  if (toolName === "get_next_week_priorities" || toolName === "get_average_order_value") {
    return true;
  }

  if (toolName !== "get_sales_summary") {
    return false;
  }

  const normalized = userQuestion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const hasAnalysisIntent = [
    "compar",
    "vs",
    "versus",
    "anterior",
    "previous",
    "top",
    "ranking",
    "stock",
    "reponer",
    "reposicion",
    "categoria",
    "tendenc",
    "evolucion",
  ].some((keyword) => normalized.includes(keyword));

  return !hasAnalysisIntent;
}

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
    case "get_average_order_value":
      model = buildAverageOrderValueCanvas(result, primary, userQuestion);
      break;
    case "get_sales_trend":
      model = buildDailySalesTrendCanvas(result, primary, userQuestion);
      break;
    case "get_monthly_trend":
      model = buildMonthlyTrendCanvas(result, primary, userQuestion);
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
    case "get_next_week_priorities":
      model = buildNextWeekPrioritiesCanvas(result, primary, userQuestion);
      break;
    default:
      model = buildDefaultCanvasModel(result, primary, userQuestion);
  }

  if (!model) return null;

  const output = asRecord(primary.output);
  const window = asRecord(output?.window);
  const days = asNumber(window?.days) ?? asNumber(window?.recentDays) ?? undefined;
  const visualizationMode = shouldUseCompactVisualization(primary.toolName, userQuestion) ? "compact" : "analysis";

  return {
    ...model,
    visualizationMode,
    suggestedQuestions: buildSuggestedQuestions(primary.toolName, { days }),
  };
}
