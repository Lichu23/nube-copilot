import type { ChatMessage } from "@/lib/ai/schemas";
import { getLocalizedValue } from "@/lib/tiendanube/types";
import {
  executeComparePeriodsTool,
  executeLowStockOpportunitiesTool,
  executeSalesSummaryTool,
  executeTopProductsTool,
  executeWeeklyBusinessSnapshotTool,
} from "@/lib/ai/tools";

type AnalystToolResult = {
  input: unknown;
  output: unknown;
  toolCallId: string;
  toolName: string;
};

export type AnalystToolResultItem = AnalystToolResult;

export type AnalystResponse = {
  answer: string;
  confidence: "high" | "medium" | "low";
  evidence: Array<{
    metric: string;
    period?: string;
    value: number | string;
  }>;
  recommendedActions: string[];
  toolResults: AnalystToolResult[];
};

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("en", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "n/a";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function describePeriodChange(metricLabel: string, currentLabel: string, previousLabel: string, percentageChange: number | null) {
  if (percentageChange == null) {
    return `There was no ${metricLabel.toLowerCase()} in ${previousLabel.toLowerCase()}, so percentage change versus ${currentLabel.toLowerCase()} is unavailable.`;
  }

  return `${metricLabel} changed ${formatPercent(percentageChange)} versus ${previousLabel.toLowerCase()}.`;
}

function extractTrailingDays(content: string) {
  const normalized = content.toLowerCase();
  const match = normalized.match(/last\s+(\d+)\s+days?/i) ?? normalized.match(/(\d+)\s*day/);
  const parsed = match ? Number(match[1]) : 7;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 7;
  }

  return Math.min(parsed, 90);
}

function extractTrailingDaysOrDefault(content: string, defaultDays: number) {
  const normalized = content.toLowerCase();

  if (!/last\s+\d+\s+days?/.test(normalized) && !/\d+\s*day/.test(normalized)) {
    return defaultDays;
  }

  return extractTrailingDays(content);
}

function extractLimit(content: string) {
  const match = content.toLowerCase().match(/top\s+(\d+)/i);
  const parsed = match ? Number(match[1]) : 5;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }

  return Math.min(parsed, 10);
}

function extractThreshold(content: string) {
  const match = content.toLowerCase().match(/below\s+(\d+)/i) ?? content.toLowerCase().match(/under\s+(\d+)/i);
  const parsed = match ? Number(match[1]) : 5;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 5;
  }

  return Math.min(parsed, 20);
}

function isLowStockIntent(normalizedMessage: string) {
  return (
    normalizedMessage.includes("low stock") ||
    normalizedMessage.includes("low-stock") ||
    normalizedMessage.includes("out of stock") ||
    normalizedMessage.includes("going out of stock") ||
    normalizedMessage.includes("stock risk") ||
    normalizedMessage.includes("stock opportunities")
  );
}

function isCompareIntent(normalizedMessage: string) {
  return (
    normalizedMessage.includes("compare") ||
    normalizedMessage.includes("vs") ||
    normalizedMessage.includes("versus") ||
    normalizedMessage.includes("previous")
  );
}

function getLatestUserMessage(messages: ChatMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("A user message is required.");
  }

  return latestUserMessage.content.trim();
}

function createToolResult(toolName: string, input: unknown, output: unknown): AnalystToolResult {
  return {
    input,
    output,
    toolCallId: `server-${toolName}`,
    toolName,
  };
}

function normalizeDescriptor(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function asLocalizedField(value: unknown) {
  if (typeof value === "string" || value === null) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, string | null>;
}

function getVariantDescriptor(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return "specific variant";
  }

  const record = raw as Record<string, unknown>;
  const descriptors: string[] = [];

  const pushDescriptor = (value: string | null | undefined) => {
    const normalized = normalizeDescriptor(value);

    if (normalized) {
      descriptors.push(normalized);
    }
  };

  const pushOptionDescriptor = (optionName: string | null | undefined, optionValue: string | null | undefined) => {
    const normalizedName = normalizeDescriptor(optionName);
    const normalizedValue = normalizeDescriptor(optionValue);

    if (normalizedName && normalizedValue && normalizedName.toLowerCase() !== normalizedValue.toLowerCase()) {
      pushDescriptor(`${normalizedName} ${normalizedValue}`);
      return;
    }

    pushDescriptor(normalizedValue);
  };

  const directOptions = [
    ["option1", "option1_value"],
    ["option2", "option2_value"],
    ["option3", "option3_value"],
    ["attribute1", "value1"],
    ["attribute2", "value2"],
    ["attribute3", "value3"],
  ] as const;

  for (const [nameKey, valueKey] of directOptions) {
    pushOptionDescriptor(
      typeof record[nameKey] === "string" ? record[nameKey] : null,
      typeof record[valueKey] === "string" ? record[valueKey] : null,
    );
  }

  for (const fieldName of ["values", "options", "attributes"] as const) {
    const field = record[fieldName];

    if (!Array.isArray(field)) {
      continue;
    }

    for (const entry of field) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const valueRecord = entry as Record<string, unknown>;
      const optionName =
        typeof valueRecord.name === "string"
          ? valueRecord.name
          : typeof valueRecord.attribute === "string"
            ? valueRecord.attribute
            : typeof valueRecord.option === "string"
              ? valueRecord.option
              : typeof valueRecord.key === "string"
                ? valueRecord.key
                : null;
      const optionValue =
        (typeof valueRecord.value === "string" ? valueRecord.value : null) ??
        (typeof valueRecord.label === "string" ? valueRecord.label : null) ??
        getLocalizedValue(asLocalizedField(valueRecord.name));

      pushOptionDescriptor(optionName, optionValue);
    }
  }

  pushDescriptor(getLocalizedValue(asLocalizedField(record.variant_name)));

  const uniqueDescriptors = [...new Set(descriptors)];
  return uniqueDescriptors[0] ?? "specific variant";
}

function getLowStockStatus(stock: number) {
  return stock <= 0 ? "out_of_stock" : "at_risk";
}

async function handleCompareIntent(content: string): Promise<AnalystResponse> {
  const days = extractTrailingDays(content);
  const input = { days };
  const output = await executeComparePeriodsTool(input);
  const { comparison, currentWindow, previousWindow } = output;
  const currency = comparison.currency;
  const hasAnySales =
    comparison.revenue.current > 0 ||
    comparison.revenue.previous > 0 ||
    comparison.orderCount.current > 0 ||
    comparison.orderCount.previous > 0;

  if (!hasAnySales) {
    return {
      answer: `No sales activity was found for ${currentWindow.label.toLowerCase()} or ${previousWindow.label.toLowerCase()}.`,
      confidence: "high",
      evidence: [
        { metric: "Revenue", period: currentWindow.label, value: formatCurrency(comparison.revenue.current, currency) },
        { metric: "Revenue", period: previousWindow.label, value: formatCurrency(comparison.revenue.previous, currency) },
      ],
      recommendedActions: [
        "Confirm the store has synced recent orders.",
        "Expand the time window if you expect older sales activity.",
      ],
      toolResults: [createToolResult("compare_periods", input, output)],
    };
  }

  const answer = [
    `Performance comparison for ${currentWindow.label.toLowerCase()} versus ${previousWindow.label.toLowerCase()}:`,
    `Revenue was ${formatCurrency(comparison.revenue.current, currency)} vs ${formatCurrency(comparison.revenue.previous, currency)}.`,
    describePeriodChange("Revenue", currentWindow.label, previousWindow.label, comparison.revenue.percentageChange),
    `Orders were ${comparison.orderCount.current} vs ${comparison.orderCount.previous}, and units sold were ${comparison.unitsSold.current} vs ${comparison.unitsSold.previous}.`,
    `Average order value was ${formatCurrency(comparison.averageOrderValue.current, currency)} vs ${formatCurrency(comparison.averageOrderValue.previous, currency)}.`,
  ].join(" ");

  return {
    answer,
    confidence: "high",
    evidence: [
      { metric: "Revenue", period: currentWindow.label, value: formatCurrency(comparison.revenue.current, currency) },
      { metric: "Revenue", period: previousWindow.label, value: formatCurrency(comparison.revenue.previous, currency) },
      { metric: "Orders", period: currentWindow.label, value: comparison.orderCount.current },
      { metric: "Orders", period: previousWindow.label, value: comparison.orderCount.previous },
      { metric: "Units sold", period: currentWindow.label, value: comparison.unitsSold.current },
      { metric: "Units sold", period: previousWindow.label, value: comparison.unitsSold.previous },
    ],
    recommendedActions: [
      "Review traffic and campaign changes that explain the period delta.",
      "Check product and inventory readiness if orders are increasing.",
    ],
    toolResults: [createToolResult("compare_periods", input, output)],
  };
}

async function handleSummaryIntent(content: string): Promise<AnalystResponse> {
  const days = extractTrailingDays(content);
  const input = { days };
  const output = await executeSalesSummaryTool(input);
  const { summary, window } = output;

  if (summary.revenue === 0 && summary.orderCount === 0 && summary.unitsSold === 0) {
    return {
      answer: `No sales were found in the last ${window.days} days.`,
      confidence: "high",
      evidence: [
        { metric: "Revenue", period: `Last ${window.days} days`, value: formatCurrency(summary.revenue, summary.currency) },
        { metric: "Orders", period: `Last ${window.days} days`, value: summary.orderCount },
      ],
      recommendedActions: [
        "Check that the store sync completed successfully.",
        "Try a longer window if sales happened earlier than this period.",
      ],
      toolResults: [createToolResult("get_sales_summary", input, output)],
    };
  }

  const answer = [
    `Sales summary for the last ${window.days} days:`,
    `Revenue was ${formatCurrency(summary.revenue, summary.currency)}, from ${summary.orderCount} orders and ${summary.unitsSold} units sold.`,
    `Average order value was ${formatCurrency(summary.averageOrderValue, summary.currency)}.`,
  ].join(" ");

  return {
    answer,
    confidence: "high",
    evidence: [
      { metric: "Revenue", period: `Last ${window.days} days`, value: formatCurrency(summary.revenue, summary.currency) },
      { metric: "Orders", period: `Last ${window.days} days`, value: summary.orderCount },
      { metric: "Units sold", period: `Last ${window.days} days`, value: summary.unitsSold },
      {
        metric: "Average order value",
        period: `Last ${window.days} days`,
        value: formatCurrency(summary.averageOrderValue, summary.currency),
      },
    ],
    recommendedActions: [
      "Track whether order volume or average order value is driving the result.",
      "Compare this summary with the previous period for trend context.",
    ],
    toolResults: [createToolResult("get_sales_summary", input, output)],
  };
}

async function handleTopProductsIntent(content: string): Promise<AnalystResponse> {
  const days = extractTrailingDays(content);
  const limit = extractLimit(content);
  const input = { days, limit };
  const output = await executeTopProductsTool(input);
  const { products, summary, window } = output;
  const topProduct = products[0] ?? null;
  const currency = summary.currency;

  const answer = topProduct
    ? [
        `Top products for the last ${window.days} days:`,
        `${topProduct.name} leads with ${formatCurrency(topProduct.revenue, currency)} from ${topProduct.unitsSold} units across ${topProduct.orderCount} orders.`,
        `I returned the top ${products.length} products in the evidence payload for this answer.`,
      ].join(" ")
    : `No product sales were found in the last ${window.days} days.`;

  return {
    answer,
    confidence: products.length > 0 ? "high" : "medium",
    evidence: products.slice(0, Math.min(products.length, 3)).map((product, index) => ({
      metric: `#${index + 1} ${product.name}`,
      period: `Last ${window.days} days`,
      value: formatCurrency(product.revenue, currency),
    })),
    recommendedActions:
      products.length > 0
        ? [
            "Review whether your top sellers have enough stock to sustain demand.",
            "Use the top-product list to inform promotions or bundles.",
          ]
        : ["Run a sync check and confirm there were completed orders in the selected window."],
    toolResults: [createToolResult("get_top_products", input, output)],
  };
}

async function handleWeeklySnapshotIntent(): Promise<AnalystResponse> {
  const output = await executeWeeklyBusinessSnapshotTool();
  const { comparison, summary, topProducts, window } = output;
  const currency = summary.summary.currency;
  const topProduct = topProducts.products[0] ?? null;

  if (summary.summary.revenue === 0 && summary.summary.orderCount === 0 && summary.summary.unitsSold === 0) {
    return {
      answer: `No business activity was found in the weekly snapshot for the last ${window.days} days.`,
      confidence: "high",
      evidence: [
        { metric: "Revenue", period: window.label, value: formatCurrency(summary.summary.revenue, currency) },
        { metric: "Orders", period: window.label, value: summary.summary.orderCount },
      ],
      recommendedActions: [
        "Confirm the latest sync completed successfully.",
        "Use a longer summary window if you expect older sales activity.",
      ],
      toolResults: [createToolResult("get_weekly_business_snapshot", {}, output)],
    };
  }

  const answer = [
    `Weekly snapshot for the last ${window.days} days:`,
    `Revenue reached ${formatCurrency(summary.summary.revenue, currency)} from ${summary.summary.orderCount} orders and ${summary.summary.unitsSold} units sold.`,
    describePeriodChange("Revenue", "Last 7 days", "Previous 7 days", comparison.comparison.revenue.percentageChange),
    topProduct
      ? `${topProduct.name} was the top product at ${formatCurrency(topProduct.revenue, currency)}.`
      : "No top product was identified for the week.",
  ].join(" ");

  return {
    answer,
    confidence: "high",
    evidence: [
      { metric: "Revenue", period: window.label, value: formatCurrency(summary.summary.revenue, currency) },
      { metric: "Orders", period: window.label, value: summary.summary.orderCount },
      { metric: "Units sold", period: window.label, value: summary.summary.unitsSold },
      {
        metric: "Revenue vs previous week",
        period: window.label,
        value: formatPercent(comparison.comparison.revenue.percentageChange),
      },
      ...(topProduct
        ? [
            {
              metric: `Top product: ${topProduct.name}`,
              period: window.label,
              value: formatCurrency(topProduct.revenue, currency),
            },
          ]
        : []),
    ],
    recommendedActions: [
      "Review whether the revenue change came from traffic, conversion, or average order value.",
      "Check stock for the top product before pushing more weekly demand.",
    ],
    toolResults: [createToolResult("get_weekly_business_snapshot", {}, output)],
  };
}

async function handleLowStockIntent(content: string): Promise<AnalystResponse> {
  const limit = extractLimit(content);
  const stockThreshold = extractThreshold(content);
  const input = {
    limit,
    recentDays: extractTrailingDaysOrDefault(content, 30),
    stockThreshold,
  };
  const output = await executeLowStockOpportunitiesTool(input);
  const outOfStockItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "out_of_stock");
  const atRiskItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "at_risk");
  const topRisk = output.opportunities[0] ?? null;

  const answer = topRisk
    ? [
        `Low-stock opportunities: ${outOfStockItems.length} variant${outOfStockItems.length === 1 ? " is" : "s are"} already out of stock${atRiskItems.length > 0 ? ` and ${atRiskItems.length} more variant${atRiskItems.length === 1 ? " is" : "s are"} at risk below ${stockThreshold} units` : ""}.`,
        `${topRisk.name} - ${getVariantDescriptor(topRisk.raw)} ${topRisk.stock <= 0 ? "is already at 0 units" : `has ${topRisk.stock} units left`} and sold ${topRisk.recentUnitsSold} units in the last ${input.recentDays} days.`,
        `I returned the top ${output.opportunities.length} low-stock items in the evidence payload for this answer.`,
      ].join(" ")
    : `No low-stock opportunities were found below ${stockThreshold} units in the last ${input.recentDays} days.`;

  return {
    answer,
    confidence: output.opportunities.length > 0 ? "high" : "medium",
    evidence: output.opportunities.slice(0, Math.min(output.opportunities.length, 3)).map((item) => ({
      metric: `${item.name} - ${getVariantDescriptor(item.raw)}`,
      period: item.stock <= 0 ? "Out of stock now" : `At risk (stock <= ${stockThreshold})`,
      value: `${item.stock} units (${item.recentUnitsSold} sold in ${input.recentDays}d)`,
    })),
    recommendedActions:
      output.opportunities.length > 0
        ? [
            "Replenish the variants already out of stock first.",
            "Review demand on the remaining at-risk variants before running more promotions.",
          ]
        : ["Try a higher stock threshold or a longer recent-sales window if you expect more at-risk items."],
    toolResults: [createToolResult("get_low_stock_opportunities", input, output)],
  };
}

function handleUnsupportedIntent(): AnalystResponse {
  return {
    answer:
      "I can help with sales summaries, weekly snapshots, period comparisons, top products, and low-stock opportunities. Try: 'weekly snapshot', 'sales summary for the last 30 days', 'compare the last 7 days vs the previous 7 days', 'top products for the last 30 days', or 'low-stock opportunities'.",
    confidence: "low",
    evidence: [],
    recommendedActions: [
      "Ask for a sales summary with a time window.",
      "Ask for a weekly snapshot.",
      "Ask to compare one trailing period with the previous one.",
      "Ask for top products in the last N days.",
      "Ask for low-stock opportunities.",
    ],
    toolResults: [],
  };
}

export async function generateAnalystResponse(messages: ChatMessage[]) {
  const latestUserMessage = getLatestUserMessage(messages);
  const normalizedMessage = latestUserMessage.toLowerCase();

  console.info("[ai-chat] generateAnalystResponse:start", {
    messageCount: messages.length,
    messages: messages.map((message, index) => ({
      contentPreview: message.content.slice(0, 160),
      index,
      role: message.role,
    })),
    mode: "deterministic-router",
  });

  try {
    const response =
      isLowStockIntent(normalizedMessage)
          ? await handleLowStockIntent(latestUserMessage)
          : isCompareIntent(normalizedMessage)
            ? await handleCompareIntent(latestUserMessage)
            : normalizedMessage.includes("weekly snapshot") ||
                normalizedMessage.includes("business snapshot") ||
                normalizedMessage.includes("this week") ||
                normalizedMessage.includes("how did i do this week")
              ? await handleWeeklySnapshotIntent()
          : normalizedMessage.includes("top product") || normalizedMessage.includes("top products")
            ? await handleTopProductsIntent(latestUserMessage)
              : normalizedMessage.includes("summary") ||
                  normalizedMessage.includes("revenue") ||
                  normalizedMessage.includes("orders")
                ? await handleSummaryIntent(latestUserMessage)
                : handleUnsupportedIntent();

    console.info("[ai-chat] generateAnalystResponse:success", {
      confidence: response.confidence,
      evidenceCount: response.evidence.length,
      toolResults: response.toolResults.map((toolResult) => ({
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
      })),
    });

    return response;
  } catch (error) {
    console.error("[ai-chat] generateAnalystResponse:error", {
      message: error instanceof Error ? error.message : "Unknown AI error",
      mode: "deterministic-router",
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}
