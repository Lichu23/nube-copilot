import { groq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import { analystSystemPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/schemas";
import { buildAiTools } from "@/lib/ai/tools";
import { getLocalizedValue } from "@/lib/tiendanube/types";

type AnalystToolResult = {
  input: unknown;
  output: unknown;
  toolCallId: string;
  toolName: string;
};

type ComparePeriodsOutput = {
  comparison: {
    averageOrderValue: ComparedMetric;
    currency: string | null;
    orderCount: ComparedMetric;
    revenue: ComparedMetric;
    unitsSold: ComparedMetric;
  };
  currentWindow: {
    endDate: string;
    label: string;
    startDate: string;
  };
  previousWindow: {
    endDate: string;
    label: string;
    startDate: string;
  };
};

type ComparedMetric = {
  absoluteChange: number;
  current: number;
  percentageChange: number | null;
  previous: number;
};

type SalesSummaryOutput = {
  summary: {
    averageOrderValue: number;
    currency: string | null;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  };
  window: {
    days: number;
    endDate: string;
    startDate: string;
  };
};

type TopProductsOutput = {
  products: Array<{
    name: string;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  }>;
  summary: {
    currency: string | null;
    revenue: number;
  };
  window: {
    days: number;
    endDate: string;
    limit: number;
    startDate: string;
  };
};

type WeeklySnapshotOutput = {
  comparison: {
    comparison: {
      averageOrderValue: ComparedMetric;
      currency: string | null;
      orderCount: ComparedMetric;
      revenue: ComparedMetric;
      unitsSold: ComparedMetric;
    };
  };
  summary: SalesSummaryOutput;
  topProducts: TopProductsOutput;
  window: {
    days: number;
    label: string;
  };
};

type LowStockOutput = {
  opportunities: Array<{
    name: string;
    raw: unknown;
    recentUnitsSold: number;
    sku: string | null;
    stock: number;
  }>;
  window: {
    limit: number;
    recentDays: number;
    stockThreshold: number;
  };
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

function summarizeForLog(value: unknown) {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 180)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return {
      firstItem:
        value.length > 0 && typeof value[0] === "object" && value[0] !== null
          ? { keys: Object.keys(value[0] as Record<string, unknown>).slice(0, 8) }
          : value[0] ?? null,
      length: value.length,
      type: "array",
    };
  }

  if (typeof value === "object") {
    return {
      keys: Object.keys(value as Record<string, unknown>).slice(0, 12),
      type: "object",
    };
  }

  return String(value);
}

function getGroqModel() {
  if (!process.env.GROQ_MODEL) {
    throw new Error("GROQ_MODEL is not configured.");
  }

  return groq(process.env.GROQ_MODEL as Parameters<typeof groq>[0]);
}

function trimMessages(messages: ChatMessage[]) {
  return messages.slice(-10).map((message) => ({
    content: message.content,
    role: message.role,
  }));
}

function getLatestUserMessage(messages: ChatMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("A user message is required.");
  }

  return latestUserMessage.content.trim();
}

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

function getIntentToolSelection(latestUserMessage: string) {
  const normalized = latestUserMessage.toLowerCase();

  if (
    normalized.includes("low stock") ||
    normalized.includes("low-stock") ||
    normalized.includes("out of stock") ||
    normalized.includes("going out of stock") ||
    normalized.includes("stock risk") ||
    normalized.includes("stock opportunities")
  ) {
    return {
      activeTools: ["get_low_stock_opportunities"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("compare") ||
    normalized.includes("vs") ||
    normalized.includes("versus") ||
    normalized.includes("previous")
  ) {
    return {
      activeTools: ["compare_periods"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("weekly snapshot") ||
    normalized.includes("business snapshot") ||
    normalized.includes("this week") ||
    normalized.includes("how did i do this week")
  ) {
    return {
      activeTools: ["get_weekly_business_snapshot"] as const,
      toolChoice: "required" as const,
    };
  }

  if (normalized.includes("top product") || normalized.includes("top products")) {
    return {
      activeTools: ["get_top_products"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("summary") ||
    normalized.includes("revenue") ||
    normalized.includes("orders")
  ) {
    return {
      activeTools: ["get_sales_summary"] as const,
      toolChoice: "required" as const,
    };
  }

  return {
    activeTools: [
      "compare_periods",
      "get_sales_summary",
      "get_top_products",
      "get_weekly_business_snapshot",
      "get_low_stock_opportunities",
    ] as const,
    toolChoice: "auto" as const,
  };
}

function normalizeToolResults(toolResults: unknown) {
  if (!Array.isArray(toolResults)) {
    return [];
  }

  return toolResults.map((toolResult, index) => {
    const record = toolResult as Record<string, unknown>;
    return {
      input: record.input ?? null,
      output: record.output ?? null,
      toolCallId:
        typeof record.toolCallId === "string"
          ? record.toolCallId
          : typeof record.toolCallId === "number"
            ? String(record.toolCallId)
            : `groq-tool-${index + 1}`,
      toolName: typeof record.toolName === "string" ? record.toolName : `tool-${index + 1}`,
    };
  });
}

function extractAllToolResults(result: { steps?: unknown; toolResults?: unknown }) {
  const stepToolResults = Array.isArray(result.steps)
    ? result.steps.flatMap((step) =>
        normalizeToolResults(
          step && typeof step === "object" ? (step as { toolResults?: unknown }).toolResults : [],
        ),
      )
    : [];

  if (stepToolResults.length > 0) {
    return stepToolResults;
  }

  return normalizeToolResults(result.toolResults);
}

function buildUnsupportedResponse(answer: string): AnalystResponse {
  return {
    answer:
      answer.trim() ||
      "I can help with sales summaries, weekly snapshots, period comparisons, top products, and low-stock opportunities.",
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

function buildCompareResponse(answer: string, output: ComparePeriodsOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { comparison, currentWindow, previousWindow } = output;
  const currency = comparison.currency;

  return {
    answer:
      answer.trim() ||
      [
        `Performance comparison for ${currentWindow.label.toLowerCase()} versus ${previousWindow.label.toLowerCase()}:`,
        `Revenue was ${formatCurrency(comparison.revenue.current, currency)} vs ${formatCurrency(comparison.revenue.previous, currency)}.`,
        describePeriodChange("Revenue", currentWindow.label, previousWindow.label, comparison.revenue.percentageChange),
        `Orders were ${comparison.orderCount.current} vs ${comparison.orderCount.previous}, and units sold were ${comparison.unitsSold.current} vs ${comparison.unitsSold.previous}.`,
        `Average order value was ${formatCurrency(comparison.averageOrderValue.current, currency)} vs ${formatCurrency(comparison.averageOrderValue.previous, currency)}.`,
      ].join(" "),
    confidence: "high",
    evidence: [
      { metric: "Revenue", period: currentWindow.label, value: formatCurrency(comparison.revenue.current, currency) },
      { metric: "Revenue", period: previousWindow.label, value: formatCurrency(comparison.revenue.previous, currency) },
      { metric: "Orders", period: currentWindow.label, value: comparison.orderCount.current },
      { metric: "Orders", period: previousWindow.label, value: comparison.orderCount.previous },
      { metric: "Units sold", period: currentWindow.label, value: comparison.unitsSold.current },
      { metric: "Units sold", period: previousWindow.label, value: comparison.unitsSold.previous },
      {
        metric: "Average order value",
        period: currentWindow.label,
        value: formatCurrency(comparison.averageOrderValue.current, currency),
      },
      {
        metric: "Average order value",
        period: previousWindow.label,
        value: formatCurrency(comparison.averageOrderValue.previous, currency),
      },
    ],
    recommendedActions: [
      "Review traffic and campaign changes that explain the period delta.",
      "Check product and inventory readiness if orders are increasing.",
    ],
    toolResults,
  };
}

function buildSalesSummaryResponse(answer: string, output: SalesSummaryOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { summary, window } = output;
  return {
    answer:
      answer.trim() ||
      [
        `Sales summary for the last ${window.days} days:`,
        `Revenue was ${formatCurrency(summary.revenue, summary.currency)}, from ${summary.orderCount} orders and ${summary.unitsSold} units sold.`,
        `Average order value was ${formatCurrency(summary.averageOrderValue, summary.currency)}.`,
      ].join(" "),
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
    toolResults,
  };
}

function buildTopProductsResponse(answer: string, output: TopProductsOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { products, summary, window } = output;
  const topProduct = products[0] ?? null;

  return {
    answer:
      answer.trim() ||
      (topProduct
        ? [
            `Top products for the last ${window.days} days:`,
            `${topProduct.name} leads with ${formatCurrency(topProduct.revenue, summary.currency)} from ${topProduct.unitsSold} units across ${topProduct.orderCount} orders.`,
            `I returned the top ${products.length} products in the evidence payload for this answer.`,
          ].join(" ")
        : `No product sales were found in the last ${window.days} days.`),
    confidence: products.length > 0 ? "high" : "medium",
    evidence: products.slice(0, Math.min(products.length, 3)).map((product, index) => ({
      metric: `#${index + 1} ${product.name}`,
      period: `Last ${window.days} days`,
      value: formatCurrency(product.revenue, summary.currency),
    })),
    recommendedActions:
      products.length > 0
        ? [
            "Review whether your top sellers have enough stock to sustain demand.",
            "Use the top-product list to inform promotions or bundles.",
          ]
        : ["Run a sync check and confirm there were completed orders in the selected window."],
    toolResults,
  };
}

function buildWeeklySnapshotResponse(answer: string, output: WeeklySnapshotOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const currency = output.summary.summary.currency;
  const topProduct = output.topProducts.products[0] ?? null;

  return {
    answer:
      answer.trim() ||
      [
        `Weekly snapshot for the last ${output.window.days} days:`,
        `Revenue reached ${formatCurrency(output.summary.summary.revenue, currency)} from ${output.summary.summary.orderCount} orders and ${output.summary.summary.unitsSold} units sold.`,
        describePeriodChange("Revenue", "Last 7 days", "Previous 7 days", output.comparison.comparison.revenue.percentageChange),
        topProduct
          ? `${topProduct.name} was the top product at ${formatCurrency(topProduct.revenue, currency)}.`
          : "No top product was identified for the week.",
      ].join(" "),
    confidence: "high",
    evidence: [
      { metric: "Revenue", period: output.window.label, value: formatCurrency(output.summary.summary.revenue, currency) },
      { metric: "Orders", period: output.window.label, value: output.summary.summary.orderCount },
      { metric: "Units sold", period: output.window.label, value: output.summary.summary.unitsSold },
      {
        metric: "Revenue vs previous week",
        period: output.window.label,
        value: formatPercent(output.comparison.comparison.revenue.percentageChange),
      },
      ...(topProduct
        ? [
            {
              metric: `Top product: ${topProduct.name}`,
              period: output.window.label,
              value: formatCurrency(topProduct.revenue, currency),
            },
          ]
        : []),
    ],
    recommendedActions: [
      "Review whether the revenue change came from traffic, conversion, or average order value.",
      "Check stock for the top product before pushing more weekly demand.",
    ],
    toolResults,
  };
}

function buildLowStockResponse(answer: string, output: LowStockOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const outOfStockItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "out_of_stock");
  const atRiskItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "at_risk");
  const topRisk = output.opportunities[0] ?? null;
  const stockThreshold = output.window.stockThreshold;
  const recentDays = output.window.recentDays;

  return {
    answer:
      answer.trim() ||
      (topRisk
        ? [
            `Low-stock opportunities: ${outOfStockItems.length} variant${outOfStockItems.length === 1 ? " is" : "s are"} already out of stock${atRiskItems.length > 0 ? ` and ${atRiskItems.length} more variant${atRiskItems.length === 1 ? " is" : "s are"} at risk below ${stockThreshold} units` : ""}.`,
            `${topRisk.name} - ${getVariantDescriptor(topRisk.raw)} ${topRisk.stock <= 0 ? "is already at 0 units" : `has ${topRisk.stock} units left`} and sold ${topRisk.recentUnitsSold} units in the last ${recentDays} days.`,
            `I returned the top ${output.opportunities.length} low-stock items in the evidence payload for this answer.`,
          ].join(" ")
        : `No low-stock opportunities were found below ${stockThreshold} units in the last ${recentDays} days.`),
    confidence: output.opportunities.length > 0 ? "high" : "medium",
    evidence: output.opportunities.slice(0, Math.min(output.opportunities.length, 3)).map((item) => ({
      metric: `${item.name} - ${getVariantDescriptor(item.raw)}`,
      period: item.stock <= 0 ? "Out of stock now" : `At risk (stock <= ${stockThreshold})`,
      value: `${item.stock} units (${item.recentUnitsSold} sold in ${recentDays}d)`,
    })),
    recommendedActions:
      output.opportunities.length > 0
        ? [
            "Replenish the variants already out of stock first.",
            "Review demand on the remaining at-risk variants before running more promotions.",
          ]
        : ["Try a higher stock threshold or a longer recent-sales window if you expect more at-risk items."],
    toolResults,
  };
}

function buildResponseFromToolResults(answer: string, toolResults: AnalystToolResult[]): AnalystResponse {
  const primary = toolResults[toolResults.length - 1] ?? null;

  if (!primary) {
    return buildUnsupportedResponse(answer);
  }

  switch (primary.toolName) {
    case "compare_periods":
      return buildCompareResponse(answer, primary.output as ComparePeriodsOutput, toolResults);
    case "get_sales_summary":
      return buildSalesSummaryResponse(answer, primary.output as SalesSummaryOutput, toolResults);
    case "get_top_products":
      return buildTopProductsResponse(answer, primary.output as TopProductsOutput, toolResults);
    case "get_weekly_business_snapshot":
      return buildWeeklySnapshotResponse(answer, primary.output as WeeklySnapshotOutput, toolResults);
    case "get_low_stock_opportunities":
      return buildLowStockResponse(answer, primary.output as LowStockOutput, toolResults);
    default:
      return buildUnsupportedResponse(answer);
  }
}

export async function generateAnalystResponse(
  messages: ChatMessage[],
  options?: { requestId?: string },
): Promise<AnalystResponse> {
  const preparedMessages = trimMessages(messages);
  const latestUserMessage = getLatestUserMessage(messages);
  const toolSelection = getIntentToolSelection(latestUserMessage);
  const requestId = options?.requestId ?? "ai-chat";
  const startedAt = Date.now();
  const modelId = process.env.GROQ_MODEL ?? "unknown-model";
  const forcedToolName =
    toolSelection.toolChoice === "required" && toolSelection.activeTools.length === 1
      ? toolSelection.activeTools[0]
      : null;

  console.info("[ai-chat] generateAnalystResponse:start", {
    messageCount: preparedMessages.length,
    messages: preparedMessages.map((message, index) => ({
      contentPreview: message.content.slice(0, 160),
      index,
      role: message.role,
    })),
    activeTools: toolSelection.activeTools,
    mode: "groq-tool-orchestration-pipeline",
    modelId,
    requestId,
    toolChoice: toolSelection.toolChoice,
  });

  try {
    const result = await generateText({
      experimental_onToolCallFinish: (event) => {
        console.info("[ai-chat] tool:finish", {
          durationMs: Date.now() - startedAt,
          requestId,
          success: event.success,
          toolCallId: event.toolCall.toolCallId,
          toolName: event.toolCall.toolName,
          ...(event.success
            ? { output: summarizeForLog(event.output) }
            : {
                error:
                  event.error instanceof Error
                    ? event.error.message
                    : typeof event.error === "string"
                      ? event.error
                      : "Unknown tool error",
              }),
        });
      },
      experimental_onToolCallStart: (event) => {
        console.info("[ai-chat] tool:start", {
          input: summarizeForLog(event.toolCall.input),
          requestId,
          toolCallId: event.toolCall.toolCallId,
          toolName: event.toolCall.toolName,
        });
      },
      messages: preparedMessages,
      model: getGroqModel(),
      onStepFinish: (event) => {
        console.info("[ai-chat] step:finish", {
          durationMs: Date.now() - startedAt,
          finishReason: event.finishReason,
          requestId,
          stepTextPreview: event.text ? summarizeForLog(event.text) : null,
          toolCalls: event.toolCalls.map((toolCall) => ({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
          })),
          toolResults: event.toolResults.map((toolResult) => ({
            output: summarizeForLog(toolResult.output),
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
          })),
          usage: event.usage,
        });
      },
      activeTools: [...toolSelection.activeTools],
      prepareStep: ({ stepNumber, steps }) => {
        const previousStepHasToolResults =
          stepNumber > 0 &&
          steps.some((step) => Array.isArray(step.toolResults) && step.toolResults.length > 0);

        if (previousStepHasToolResults) {
          console.info("[ai-chat] prepareStep:disable-tools", {
            reason: "tool-results-already-available",
            requestId,
            stepNumber,
          });

          return {
            activeTools: [],
            toolChoice: "none",
          };
        }

        if (forcedToolName) {
          return {
            activeTools: [forcedToolName],
            toolChoice: {
              toolName: forcedToolName,
              type: "tool",
            },
          };
        }

        return undefined;
      },
      stopWhen: stepCountIs(2),
      system: analystSystemPrompt,
      toolChoice: toolSelection.toolChoice,
      tools: buildAiTools(),
    });

    const toolResults = extractAllToolResults(result);
    const answer = result.text.trim();
    const response = buildResponseFromToolResults(answer, toolResults);

    console.info("[ai-chat] generateAnalystResponse:success", {
      confidence: response.confidence,
      durationMs: Date.now() - startedAt,
      evidenceCount: response.evidence.length,
      finishReason: result.finishReason,
      modelId,
      rawTextPreview: summarizeForLog(answer),
      requestId,
      toolResults: response.toolResults.map((toolResult) => ({
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
      })),
    });

    return response;
  } catch (error) {
    console.error("[ai-chat] generateAnalystResponse:error", {
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown AI error",
      mode: "groq-tool-orchestration-pipeline",
      modelId,
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}
