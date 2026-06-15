import { groq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import { analystSystemPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/schemas";
import { buildAiTools, executeWeeklyBusinessSnapshotTool } from "@/lib/ai/tools";
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

import { formatCurrency, formatPercent } from "@/lib/formatting";

function summarizeForLog(value: unknown) {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 180)}?` : value;
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
    throw new Error("Se requiere un mensaje del usuario.");
  }

  return latestUserMessage.content.trim();
}




function describePeriodChange(metricLabel: string, currentLabel: string, previousLabel: string, percentageChange: number | null) {
  if (percentageChange == null) {
    return `No hubo ${metricLabel.toLowerCase()} en ${previousLabel.toLowerCase()}, así que la variación porcentual contra ${currentLabel.toLowerCase()} no está disponible.`;
  }

  const direction = percentageChange > 0 ? "subió" : percentageChange < 0 ? "bajó" : "se mantuvo";
  return `${metricLabel} ${direction} ${formatPercent(Math.abs(percentageChange))} frente a ${previousLabel.toLowerCase()}.`;
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
    return "variante especifica";
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
  return uniqueDescriptors[0] ?? "variante especifica";
}

function getLowStockStatus(stock: number) {
  return stock <= 0 ? "out_of_stock" : "at_risk";
}

function buildUnsupportedRecommendations() {
  return [
    "Pedime un resumen de ventas de los ultimos 7 dias.",
    "Pedime comparar esta semana contra la anterior.",
    "Pedime que productos estan en riesgo de quedarse sin stock.",
  ];
}

function getUnsupportedIntentResponse(latestUserMessage: string): AnalystResponse | null {
  const normalized = latestUserMessage.toLowerCase();

  if (
    normalized.includes("roas") ||
    normalized.includes("meta ads") ||
    normalized.includes("campanas de meta")
  ) {
    return buildUnsupportedResponse(
      "No tengo acceso a datos de Meta Ads ni a metricas publicitarias como ROAS. Por ahora solo puedo responder con metricas soportadas de Tiendanube.",
      buildUnsupportedRecommendations(),
    );
  }

  if (
    normalized.includes("instagram") ||
    normalized.includes("seguidores") ||
    normalized.includes("followers") ||
    normalized.includes("alcance") ||
    normalized.includes("engagement")
  ) {
    return buildUnsupportedResponse(
      "Eso hoy esta fuera de alcance. No tengo acceso a metricas de Instagram; solo puedo ayudarte con ventas, productos e inventario de Tiendanube.",
      buildUnsupportedRecommendations(),
    );
  }

  return null;
}

function getIntentToolSelection(latestUserMessage: string) {
  const normalized = latestUserMessage
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("low stock") ||
    normalized.includes("low-stock") ||
    normalized.includes("out of stock") ||
    normalized.includes("going out of stock") ||
    normalized.includes("stock risk") ||
    normalized.includes("stock opportunities") ||
    normalized.includes("stock bajo") ||
    normalized.includes("qued") ||
    normalized.includes("sin stock") ||
    normalized.includes("reponer") ||
    normalized.includes("reposicion")
  ) {
    return {
      activeTools: ["get_low_stock_opportunities"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("que producto vendio mas") ||
    normalized.includes("producto top") ||
    normalized.includes("top product") ||
    normalized.includes("top products") ||
    normalized.includes("productos top") ||
    normalized.includes("productos mas vendidos") ||
    normalized.includes("mejores productos")
  ) {
    return {
      activeTools: ["get_top_products"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("compare") ||
    normalized.includes("vs") ||
    normalized.includes("versus") ||
    normalized.includes("previous") ||
    normalized.includes("compar") ||
    normalized.includes("anterior")
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
    normalized.includes("how did i do this week") ||
    normalized.includes("resumen semanal") ||
    normalized.includes("esta semana") ||
    normalized.includes("ultima semana") ||
    normalized.includes("ultimos 7 dias") ||
    normalized.includes("performance semanal") ||
    normalized.includes("performance de la semana") ||
    normalized.includes("performance de ultima semana") ||
    normalized.includes("que cambio esta semana") ||
    normalized.includes("que paso esta semana")
  ) {
    return {
      activeTools: ["get_weekly_business_snapshot"] as const,
      toolChoice: "required" as const,
    };
  }

  if (
    normalized.includes("summary") ||
    normalized.includes("revenue") ||
    normalized.includes("orders") ||
    normalized.includes("resumen") ||
    normalized.includes("ventas") ||
    normalized.includes("ingresos") ||
    normalized.includes("pedidos")
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

function buildUnsupportedResponse(answer: string, recommendedActions = buildUnsupportedRecommendations()): AnalystResponse {
  return {
    answer:
      answer.trim() ||
      "Todavia no puedo responder esa pregunta con datos confiables. Puedo ayudarte con ventas, comparaciones entre periodos, productos top, resumen semanal y oportunidades de stock bajo.",
    confidence: "low",
    evidence: [],
    recommendedActions,
    toolResults: [],
  };
}

function buildCompareResponse(_answer: string, output: ComparePeriodsOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { comparison, currentWindow, previousWindow } = output;
  const currency = comparison.currency;

  return {
    answer: [
      `Comparación de rendimiento entre ${currentWindow.label.toLowerCase()} y ${previousWindow.label.toLowerCase()}:`,
      `La facturación fue ${formatCurrency(comparison.revenue.current, currency)} vs ${formatCurrency(comparison.revenue.previous, currency)}.`,
      describePeriodChange("La facturación", currentWindow.label, previousWindow.label, comparison.revenue.percentageChange),
      `Los pedidos fueron ${comparison.orderCount.current} vs ${comparison.orderCount.previous}, y las unidades vendidas fueron ${comparison.unitsSold.current} vs ${comparison.unitsSold.previous}.`,
      `El ticket promedio fue ${formatCurrency(comparison.averageOrderValue.current, currency)} vs ${formatCurrency(comparison.averageOrderValue.previous, currency)}.`,
    ].join(" "),
    confidence: "high",
    evidence: [
      { metric: "Facturación", period: currentWindow.label, value: formatCurrency(comparison.revenue.current, currency) },
      { metric: "Facturación", period: previousWindow.label, value: formatCurrency(comparison.revenue.previous, currency) },
      { metric: "Pedidos", period: currentWindow.label, value: comparison.orderCount.current },
      { metric: "Pedidos", period: previousWindow.label, value: comparison.orderCount.previous },
      { metric: "Unidades vendidas", period: currentWindow.label, value: comparison.unitsSold.current },
      { metric: "Unidades vendidas", period: previousWindow.label, value: comparison.unitsSold.previous },
      { metric: "Ticket promedio", period: currentWindow.label, value: formatCurrency(comparison.averageOrderValue.current, currency) },
      { metric: "Ticket promedio", period: previousWindow.label, value: formatCurrency(comparison.averageOrderValue.previous, currency) },
    ],
    recommendedActions: [
      "Revisá cambios de tráfico o campañas que expliquen la diferencia entre períodos.",
      "Chequeá producto e inventario si los pedidos vienen creciendo.",
    ],
    toolResults,
  };
}

function buildSalesSummaryResponse(_answer: string, output: SalesSummaryOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { summary, window } = output;
  return {
    answer: [
      `Resumen de ventas de los últimos ${window.days} días:`,
      `La facturación fue ${formatCurrency(summary.revenue, summary.currency)}, con ${summary.orderCount} pedidos y ${summary.unitsSold} unidades vendidas.`,
      `El ticket promedio fue ${formatCurrency(summary.averageOrderValue, summary.currency)}.`,
    ].join(" "),
    confidence: "high",
    evidence: [
      { metric: "Facturación", period: `últimos ${window.days} días`, value: formatCurrency(summary.revenue, summary.currency) },
      { metric: "Pedidos", period: `últimos ${window.days} días`, value: summary.orderCount },
      { metric: "Unidades vendidas", period: `últimos ${window.days} días`, value: summary.unitsSold },
      { metric: "Ticket promedio", period: `últimos ${window.days} días`, value: formatCurrency(summary.averageOrderValue, summary.currency) },
    ],
    recommendedActions: [
      "Seguí si el resultado viene más por volumen de pedidos o por ticket promedio.",
      "Compará este resumen contra el período anterior para tener contexto de tendencia.",
    ],
    toolResults,
  };
}

function buildTopProductsResponse(_answer: string, output: TopProductsOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const { products, summary, window } = output;
  const topProduct = products[0] ?? null;

  return {
    answer: topProduct
      ? [
        `Productos top de los últimos ${window.days} días:`,
        `${topProduct.name} lidera con ${formatCurrency(topProduct.revenue, summary.currency)} a partir de ${topProduct.unitsSold} unidades en ${topProduct.orderCount} pedidos.`,
        products.length === 1
          ? "Dejé en la evidencia el producto principal para esta respuesta."
          : `Dejé en la evidencia los ${products.length} productos principales para esta respuesta.`,
      ].join(" ")
      : `No encontré ventas de productos en los últimos ${window.days} días.`,
    confidence: products.length > 0 ? "high" : "medium",
    evidence: products.slice(0, Math.min(products.length, 3)).map((product, index) => ({
      metric: `#${index + 1} ${product.name}`,
      period: `últimos ${window.days} días`,
      value: formatCurrency(product.revenue, summary.currency),
    })),
    recommendedActions:
      products.length > 0
        ? [
          "Revisá si tus productos más vendidos tienen stock suficiente para sostener la demanda.",
          "Usá la lista de productos top para definir promos o bundles.",
        ]
        : ["Corré una revisión de sync y confirmá que hubo pedidos completados en la ventana elegida."],
    toolResults,
  };
}

function buildWeeklySnapshotResponse(_answer: string, output: WeeklySnapshotOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const currency = output.summary.summary.currency;
  const topProduct = output.topProducts.products[0] ?? null;

  return {
    answer: [
      `Resumen semanal de los últimos ${output.window.days} días:`,
      `La facturación llegó a ${formatCurrency(output.summary.summary.revenue, currency)} con ${output.summary.summary.orderCount} pedidos y ${output.summary.summary.unitsSold} unidades vendidas.`,
      describePeriodChange("La facturación", "últimos 7 días", "7 días anteriores", output.comparison.comparison.revenue.percentageChange),
      topProduct
        ? `${topProduct.name} fue el producto top con ${formatCurrency(topProduct.revenue, currency)}.`
        : "No se identificó un producto top para la semana.",
    ].join(" "),
    confidence: "high",
    evidence: [
      { metric: "Facturación", period: output.window.label, value: formatCurrency(output.summary.summary.revenue, currency) },
      { metric: "Pedidos", period: output.window.label, value: output.summary.summary.orderCount },
      { metric: "Unidades vendidas", period: output.window.label, value: output.summary.summary.unitsSold },
      { metric: "Facturación vs semana anterior", period: output.window.label, value: formatPercent(output.comparison.comparison.revenue.percentageChange ?? 0) }, ...(topProduct
        ? [{ metric: `Producto top: ${topProduct.name}`, period: output.window.label, value: formatCurrency(topProduct.revenue, currency) }]
        : []),
    ],
    recommendedActions: [
      "Revisá si el cambio en facturación vino por tráfico, conversión o ticket promedio.",
      "Chequeá el stock del producto top antes de empujar más demanda semanal.",
    ],
    toolResults,
  };
}

function buildLowStockResponse(_answer: string, output: LowStockOutput, toolResults: AnalystToolResult[]): AnalystResponse {
  const outOfStockItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "out_of_stock");
  const atRiskItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "at_risk");
  const topRisk = output.opportunities[0] ?? null;
  const stockThreshold = output.window.stockThreshold;
  const recentDays = output.window.recentDays;

  return {
    answer: topRisk
      ? [
        `Oportunidades de stock bajo: ${outOfStockItems.length} variante${outOfStockItems.length === 1 ? " ya está" : "s ya están"} sin stock${atRiskItems.length > 0 ? ` y ${atRiskItems.length} variante${atRiskItems.length === 1 ? " está" : "s están"} en riesgo por debajo de ${stockThreshold} unidades` : ""}.`,
        `${topRisk.name} - ${getVariantDescriptor(topRisk.raw)} ${topRisk.stock <= 0 ? "ya está en 0 unidades" : `tiene ${topRisk.stock} unidades disponibles`} y vendió ${topRisk.recentUnitsSold} unidades en los últimos ${recentDays} días.`,
        `Dejé en la evidencia los ${output.opportunities.length} productos con mayor riesgo de stock.`,
      ].join(" ")
      : `No encontré oportunidades de stock bajo por debajo de ${stockThreshold} unidades en los últimos ${recentDays} días.`,
    confidence: output.opportunities.length > 0 ? "high" : "medium",
    evidence: output.opportunities.slice(0, Math.min(output.opportunities.length, 3)).map((item) => ({
      metric: `${item.name} - ${getVariantDescriptor(item.raw)}`,
      period: item.stock <= 0 ? "Sin stock ahora" : `En riesgo (stock <= ${stockThreshold})`,
      value: `${item.stock} unidades (${item.recentUnitsSold} vendidas en ${recentDays}d)`,
    })),
    recommendedActions:
      output.opportunities.length > 0
        ? [
          "Reponé primero las variantes que ya se quedaron sin stock.",
          "Revisá la demanda de las variantes en riesgo antes de correr más promociones.",
        ]
        : ["Probá con un umbral de stock más alto o una ventana de ventas más larga si esperás encontrar más riesgo."],
    toolResults,
  };
}

function actionStep(label: string, why: string, next: string) {
  return `${label}. Por que: ${why}. Siguiente paso: ${next}.`;
}

function makeResponseActionable(response: AnalystResponse, primary: AnalystToolResult): AnalystResponse {
  switch (primary.toolName) {
    case "compare_periods": {
      const output = primary.output as ComparePeriodsOutput;
      const revenueDown = output.comparison.revenue.absoluteChange < 0;
      const ordersDown = output.comparison.orderCount.absoluteChange < 0;

      return {
        ...response,
        answer: `${response.answer} Proximo paso: ${
          revenueDown
            ? "identifica si la caida viene por menos pedidos, menor ticket promedio o menos unidades vendidas."
            : "revisa que productos sostienen el crecimiento y si tienen stock suficiente."
        }`,
        recommendedActions: [
          actionStep(
            revenueDown ? "Investiga la causa antes de descontar" : "Protege lo que esta funcionando",
            revenueDown ? "un descuento sin diagnostico puede destruir margen" : "el crecimiento se corta rapido si falta stock",
            ordersDown ? "revisa productos con menos pedidos y canales de venta" : "consulta productos top del mismo periodo",
          ),
          actionStep(
            "Cruza la comparacion con productos top",
            "el total no dice que producto explica el cambio",
            "pregunta que productos vendieron mas en esta misma ventana",
          ),
        ],
      };
    }
    case "get_sales_summary": {
      const output = primary.output as SalesSummaryOutput;
      const hasOrders = output.summary.orderCount > 0;

      return {
        ...response,
        answer: `${response.answer} Proximo paso: ${
          hasOrders
            ? "comparalo contra el periodo anterior para saber si es mejora, caida o estabilidad."
            : "confirma sincronizacion y pedidos antes de tomar decisiones comerciales."
        }`,
        recommendedActions: [
          actionStep(
            hasOrders ? "Compara esta ventana contra la anterior" : "Valida la sincronizacion",
            hasOrders ? "un total aislado no muestra tendencia" : "sin pedidos sincronizados no hay lectura confiable",
            hasOrders ? `pedi comparar los ultimos ${output.window.days} dias contra el periodo anterior` : "corre sync y volve a consultar ventas",
          ),
          actionStep(
            "Separa volumen y ticket promedio",
            "las acciones cambian si vendiste menos pedidos o si bajo el ticket",
            "revisa productos top antes de definir una promo",
          ),
        ],
      };
    }
    case "get_top_products": {
      const output = primary.output as TopProductsOutput;
      const topProduct = output.products[0] ?? null;

      return {
        ...response,
        answer: topProduct
          ? `${response.answer} Proximo paso: revisa stock y margen de ${topProduct.name} antes de empujar mas demanda.`
          : `${response.answer} Proximo paso: valida la sincronizacion o usa una ventana mas larga.`,
        recommendedActions: topProduct
          ? [
              actionStep(
                `Revisa stock de ${topProduct.name}`,
                "promocionar un ganador sin stock convierte demanda en frustracion",
                "confirma unidades disponibles antes de crear una promo",
              ),
              actionStep(
                "Arma una accion comercial alrededor del top 3",
                "los productos que ya tienen demanda son la palanca mas rapida",
                "define promo, bundle o destaque para el producto con mejor stock y margen",
              ),
            ]
          : [
              actionStep(
                "Valida la sincronizacion y la ventana",
                "sin ventas de productos no hay ranking accionable",
                "corre sync y consulta una ventana mas larga",
              ),
            ],
      };
    }
    case "get_weekly_business_snapshot": {
      const output = primary.output as WeeklySnapshotOutput;
      const topProduct = output.topProducts.products[0] ?? null;
      const revenueDown = output.comparison.comparison.revenue.absoluteChange < 0;

      return {
        ...response,
        answer: `${response.answer} Proximo paso: ${
          topProduct
            ? `revisa stock de ${topProduct.name} y decidi si conviene sostener o empujar esa demanda.`
            : "revisa si hubo pedidos sincronizados esta semana."
        }`,
        recommendedActions: [
          actionStep(
            "Elige una prioridad semanal",
            "el snapshot tiene que terminar en una decision, no en observacion",
            revenueDown ? "investiga la caida empezando por productos top y pedidos perdidos" : "protege el crecimiento revisando stock del producto top",
          ),
          actionStep(
            topProduct ? `Revisa ${topProduct.name}` : "Revisa el catalogo con ventas recientes",
            topProduct ? "es el producto que mas explica la semana" : "necesitas encontrar el primer producto accionable",
            topProduct ? "confirma stock, margen y si merece una promo corta" : "consulta productos top de los ultimos 7 dias",
          ),
        ],
      };
    }
    case "get_low_stock_opportunities": {
      const output = primary.output as LowStockOutput;
      const outOfStockItems = output.opportunities.filter((item) => getLowStockStatus(item.stock) === "out_of_stock");
      const topRisk = output.opportunities[0] ?? null;

      return {
        ...response,
        answer: topRisk
          ? `${response.answer} Proximo paso: ${
              topRisk.stock <= 0 ? "reponelo antes de empujar mas trafico." : "defini si hay que reponerlo antes de que corte ventas."
            }`
          : `${response.answer} Proximo paso: proba un umbral de stock mas alto o mas dias de ventas recientes.`,
        recommendedActions: topRisk
          ? [
              actionStep(
                outOfStockItems.length > 0 ? "Repon primero las variantes sin stock" : `Revisa primero ${topRisk.name}`,
                outOfStockItems.length > 0 ? "ya estan bloqueando ventas hoy" : "combina stock bajo con demanda reciente",
                "ordena la reposicion por ventas recientes, no solo por stock disponible",
              ),
              actionStep(
                "Pausa promociones sobre productos en riesgo",
                "mas demanda sin stock suficiente puede cortar ventas y empeorar la experiencia",
                "promociona alternativas con stock sano hasta reponer",
              ),
            ]
          : [
              actionStep(
                "Amplia el umbral o la ventana de analisis",
                "puede no haber riesgo con el umbral actual",
                "proba un umbral de stock mas alto o una ventana de ventas mas larga",
              ),
            ],
      };
    }
    default:
      return response;
  }
}

function buildResponseFromToolResults(answer: string, toolResults: AnalystToolResult[]): AnalystResponse {
  const primary = toolResults[toolResults.length - 1] ?? null;

  if (!primary) {
    return buildUnsupportedResponse(answer);
  }

  switch (primary.toolName) {
    case "compare_periods":
      return makeResponseActionable(buildCompareResponse(answer, primary.output as ComparePeriodsOutput, toolResults), primary);
    case "get_sales_summary":
      return makeResponseActionable(buildSalesSummaryResponse(answer, primary.output as SalesSummaryOutput, toolResults), primary);
    case "get_top_products":
      return makeResponseActionable(buildTopProductsResponse(answer, primary.output as TopProductsOutput, toolResults), primary);
    case "get_weekly_business_snapshot":
      return makeResponseActionable(buildWeeklySnapshotResponse(answer, primary.output as WeeklySnapshotOutput, toolResults), primary);
    case "get_low_stock_opportunities":
      return makeResponseActionable(buildLowStockResponse(answer, primary.output as LowStockOutput, toolResults), primary);
    default:
      return buildUnsupportedResponse(answer);
  }
}

async function executeForcedToolFallback(toolName: string): Promise<AnalystToolResult[] | null> {
  switch (toolName) {
    case "get_weekly_business_snapshot":
      return [
        {
          input: {},
          output: await executeWeeklyBusinessSnapshotTool(),
          toolCallId: "fallback-weekly-snapshot",
          toolName,
        },
      ];
    default:
      return null;
  }
}

export async function generateAnalystResponse(
  messages: ChatMessage[],
  options?: { requestId?: string },
): Promise<AnalystResponse> {
  const preparedMessages = trimMessages(messages);
  const latestUserMessage = getLatestUserMessage(messages);
  const unsupportedIntentResponse = getUnsupportedIntentResponse(latestUserMessage);

  if (unsupportedIntentResponse) {
    return unsupportedIntentResponse;
  }

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
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error";

    if (forcedToolName && errorMessage.includes("Failed to call a function")) {
      const fallbackToolResults = await executeForcedToolFallback(forcedToolName);

      if (fallbackToolResults) {
        const fallbackResponse = buildResponseFromToolResults("", fallbackToolResults);

        console.warn("[ai-chat] generateAnalystResponse:fallback", {
          durationMs: Date.now() - startedAt,
          reason: "groq-function-call-failed",
          requestId,
          toolName: forcedToolName,
        });

        return fallbackResponse;
      }
    }

    console.error("[ai-chat] generateAnalystResponse:error", {
      durationMs: Date.now() - startedAt,
      message: errorMessage,
      mode: "groq-tool-orchestration-pipeline",
      modelId,
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}
