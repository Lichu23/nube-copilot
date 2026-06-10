"use client";

import {
  ArrowUp,
  ChartColumn,
  Copy,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  Pin,
  Settings2,
  Sparkles,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AnalystResponse, CanvasModel, ChartDatum, ChartModel, ChatMessage, ToolResult, } from "@/lib/types";

import {
  formatCurrency,
  formatDateRange,
  formatScalar
} from "@/lib/formatting";
import { asNumber, asRecord } from "@/lib/type-guards";

type ChatPanelProps = {
  hasConnection: boolean;
  initialInput?: string;
  lastSyncAt: string | null;
  storeName: string;
};

const emptyStatePrompts = [
  {
    label: "Ventas",
    prompt: "Como se comparan los ingresos contra la semana pasada?",
    tone: "text-sky-700",
  },
  {
    label: "Inventario",
    prompt: "Que SKUs se quedan sin stock en 14 dias?",
    tone: "text-orange-600",
  },
  {
    label: "Resumen semanal",
    prompt: "Dame el resumen de performance de la ultima semana",
    tone: "text-emerald-600",
  },
];

const showDebugEvidence =
  process.env.NEXT_PUBLIC_SHOW_CHAT_DEBUG_EVIDENCE === "true" || process.env.NODE_ENV !== "production";

function getPrimaryToolResult(toolResults: ToolResult[]) {
  return toolResults[toolResults.length - 1] ?? null;
}

function normalizeIntentText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Todavía no sincronizado";
  const d = new Date(lastSyncAt);
  if (Number.isNaN(d.getTime())) return "Sincronizado recientemente";
  return `Sincronizado ${d.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

function buildIntentTitle(toolName: string, userQuestion: string, options?: { days?: number; isSkuRisk?: boolean }) {
  const normalized = normalizeIntentText(userQuestion);

  switch (toolName) {
    case "compare_periods":
      return normalized.includes("ingresos") ? "Comparación de ingresos" : "Comparación entre períodos";
    case "get_sales_summary":
      return normalized.includes("como venimos") ? "Resumen de ventas" : "Resumen de ventas de los últimos 7 días";
    case "get_top_products":
      if (normalized.includes("producto") && normalized.includes("vendio mas")) {
        return "Producto más vendido de la semana";
      }

      return options?.days ? `Productos top de los últimos ${options.days} días` : "Productos top";
    case "get_weekly_business_snapshot":
      return normalized.includes("que paso") || normalized.includes("deberia hacer")
        ? "Resumen semanal y próximos pasos"
        : "Resumen semanal";
    case "get_low_stock_opportunities":
      return options?.isSkuRisk ? "SKUs sin stock o en riesgo" : "Oportunidades de stock bajo";
    default:
      return "Respuesta del analista";
  }
}

function buildCanvasModel(result: AnalystResponse | null, userQuestion: string): CanvasModel | null {
  if (!result) {
    return null;
  }

  const normalizedQuestion = normalizeIntentText(userQuestion);
  const asksForSkuRisk = normalizedQuestion.includes("sku");
  const primary = getPrimaryToolResult(result.toolResults);

  if (!primary) {
    return null;
  }

  const output = asRecord(primary.output);

  if (!output) {
    return null;
  }

  switch (primary.toolName) {
    case "compare_periods": {
      const comparison = asRecord(output.comparison);
      const currentWindow = asRecord(output.currentWindow);
      const previousWindow = asRecord(output.previousWindow);
      const revenue = comparison ? asRecord(comparison.revenue) : null;
      const orders = comparison ? asRecord(comparison.orderCount) : null;
      const unitsSold = comparison ? asRecord(comparison.unitsSold) : null;
      const averageOrderValue = comparison ? asRecord(comparison.averageOrderValue) : null;
      const currency = typeof comparison?.currency === "string" ? comparison.currency : null;
      const currentLabel = typeof currentWindow?.label === "string" ? currentWindow.label : "Período actual";
      const previousLabel = typeof previousWindow?.label === "string" ? previousWindow.label : "Período anterior";

      return {
        chart: revenue
          ? {
              currentLabel,
              data: [
                {
                  current: asNumber(revenue.current) ?? 0,
                  label: "Facturación",
                  previous: asNumber(revenue.previous) ?? 0,
                },
              ],
              previousLabel,
            }
          : null,
        filters: ["Solo pedidos pagos", "Comparación entre períodos"],
        metrics: [
          { helper: currentLabel, label: "Facturación", value: formatCurrency(asNumber(revenue?.current) ?? 0, currency) },
          { helper: currentLabel, label: "Pedidos", value: formatScalar(asNumber(orders?.current) ?? 0) },
          { helper: currentLabel, label: "AOV", value: formatCurrency(asNumber(averageOrderValue?.current) ?? 0, currency) },
          { helper: currentLabel, label: "Unidades vendidas", value: formatScalar(asNumber(unitsSold?.current) ?? 0) },
        ],
        source: "Tiendanube · API de órdenes",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Métrica", currentLabel, previousLabel],
          rows: [
            ["Facturación", formatCurrency(asNumber(revenue?.current) ?? 0, currency), formatCurrency(asNumber(revenue?.previous) ?? 0, currency)],
            ["Pedidos", formatScalar(asNumber(orders?.current) ?? 0), formatScalar(asNumber(orders?.previous) ?? 0)],
            ["Unidades vendidas", formatScalar(asNumber(unitsSold?.current) ?? 0), formatScalar(asNumber(unitsSold?.previous) ?? 0)],
            ["AOV", formatCurrency(asNumber(averageOrderValue?.current) ?? 0, currency), formatCurrency(asNumber(averageOrderValue?.previous) ?? 0, currency)],
          ],
        },
        title: buildIntentTitle(primary.toolName, userQuestion),
        userQuestion,
        windowLabel: formatDateRange(
          typeof currentWindow?.startDate === "string" ? currentWindow.startDate : null,
          typeof currentWindow?.endDate === "string" ? currentWindow.endDate : null,
        ),
      };
    }
    case "get_sales_summary": {
      const summary = asRecord(output.summary);
      const window = asRecord(output.window);
      const currency = typeof summary?.currency === "string" ? summary.currency : null;
      const revenue = asNumber(summary?.revenue) ?? 0;
      const orderCount = asNumber(summary?.orderCount) ?? 0;
      const unitsSold = asNumber(summary?.unitsSold) ?? 0;
      const averageOrderValue = asNumber(summary?.averageOrderValue) ?? 0;

      return {
        chart: {
          data: [
            { current: revenue, label: "Facturación" },
            { current: orderCount, label: "Pedidos" },
            { current: unitsSold, label: "Unidades vendidas" },
          ],
        },
        filters: ["Solo pedidos pagos"],
        metrics: [
          { label: "Facturación", value: formatCurrency(revenue, currency) },
          { label: "Pedidos", value: formatScalar(orderCount) },
          { label: "AOV", value: formatCurrency(averageOrderValue, currency) },
          { label: "Unidades vendidas", value: formatScalar(unitsSold) },
        ],
        source: "Tiendanube · API de órdenes",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Métrica", "Valor"],
          rows: [
            ["Facturación", formatCurrency(revenue, currency)],
            ["Pedidos", formatScalar(orderCount)],
            ["Unidades vendidas", formatScalar(unitsSold)],
            ["Ticket promedio", formatCurrency(averageOrderValue, currency)],
          ],
        },
        title: buildIntentTitle(primary.toolName, userQuestion),
        userQuestion,
        windowLabel: formatDateRange(
          typeof window?.startDate === "string" ? window.startDate : null,
          typeof window?.endDate === "string" ? window.endDate : null,
        ),
      };
    }
    case "get_top_products": {
      const products = Array.isArray(output.products) ? output.products : [];
      const summary = asRecord(output.summary);
      const window = asRecord(output.window);
      const currency = typeof summary?.currency === "string" ? summary.currency : null;

      const rows = products
        .map((item) => {
          const record = asRecord(item);
          if (!record || typeof record.name !== "string") return null;
          return [
            record.name,
            formatScalar(asNumber(record.unitsSold) ?? 0),
            formatCurrency(asNumber(record.revenue) ?? 0, currency),
            formatScalar(asNumber(record.orderCount) ?? 0),
          ];
        })
        .filter((row): row is string[] => Boolean(row));

      return {
        chart: {
          data: products
            .map((item) => {
              const record = asRecord(item);
              if (!record || typeof record.name !== "string") return null;
              return {
                current: asNumber(record.revenue) ?? 0,
                label: record.name,
              };
            })
            .filter((item): item is ChartDatum => Boolean(item)),
        },
        filters: ["Ordenado por facturación bruta del producto"],
        metrics: [
          { label: "Productos", value: formatScalar(rows.length) },
          { label: "Facturación bruta", value: formatCurrency(asNumber(summary?.revenue) ?? 0, currency) },
          { label: "Producto top", value: rows[0]?.[0] ?? "-" },
        ],
        source: "Tiendanube · Órdenes + ítems de pedido",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Producto", "Unidades", "Facturación", "Pedidos"],
          rows,
        },
        title: buildIntentTitle(primary.toolName, userQuestion, {
          days: asNumber(window?.days) ?? undefined,
        }),
        userQuestion,
        windowLabel: formatDateRange(
          typeof window?.startDate === "string" ? window.startDate : null,
          typeof window?.endDate === "string" ? window.endDate : null,
        ),
      };
    }
    case "get_weekly_business_snapshot": {
      const summary = asRecord(output.summary);
      const summaryMetrics = summary ? asRecord(summary.summary) : null;
      const comparison = asRecord(output.comparison);
      const comparisonMetrics = comparison ? asRecord(comparison.comparison) : null;
      const revenueComparison = comparisonMetrics ? asRecord(comparisonMetrics.revenue) : null;
      const currency = typeof summaryMetrics?.currency === "string" ? summaryMetrics.currency : null;
      const revenue = asNumber(summaryMetrics?.revenue) ?? 0;
      const orders = asNumber(summaryMetrics?.orderCount) ?? 0;
      const averageOrderValue = asNumber(summaryMetrics?.averageOrderValue) ?? 0;
      const unitsSold = asNumber(summaryMetrics?.unitsSold) ?? 0;

      return {
        chart: {
          currentLabel: "Últimos 7 días",
          data: [
            {
              current: revenue,
              label: "Facturación",
              previous: asNumber(revenueComparison?.previous) ?? 0,
            },
          ],
          previousLabel: "7 días anteriores",
        },
        filters: ["Solo pedidos pagos", "Vista de resumen semanal"],
        metrics: [
          { label: "Facturación", value: formatCurrency(revenue, currency) },
          { label: "Pedidos", value: formatScalar(orders) },
          { label: "AOV", value: formatCurrency(averageOrderValue, currency) },
          { label: "Unidades vendidas", value: formatScalar(unitsSold) },
        ],
        source: "Tiendanube · API de órdenes",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Métrica", "Últimos 7 días", "7 días anteriores"],
          rows: [
            ["Facturación", formatCurrency(revenue, currency), formatCurrency(asNumber(revenueComparison?.previous) ?? 0, currency)],
            ["Pedidos", formatScalar(orders), "—"],
            ["Ticket promedio", formatCurrency(averageOrderValue, currency), "—"],
            ["Unidades vendidas", formatScalar(unitsSold), "—"],
          ],
        },
        title: buildIntentTitle(primary.toolName, userQuestion),
        userQuestion,
        windowLabel:
          typeof output.window === "object" && output.window && "label" in output.window
            ? String((output.window as Record<string, unknown>).label)
            : "Últimos 7 días",
      };
    }
    case "get_low_stock_opportunities": {
      const opportunities = Array.isArray(output.opportunities) ? output.opportunities : [];
      const window = asRecord(output.window);
      const threshold = asNumber(window?.stockThreshold) ?? 0;

      const rows = opportunities
        .map((item) => {
          const record = asRecord(item);
          if (!record || typeof record.name !== "string") return null;
          return [
            record.name,
            typeof record.sku === "string" && record.sku.trim().length > 0 ? record.sku : "SKU no disponible",
            formatScalar(asNumber(record.stock) ?? 0),
            formatScalar(asNumber(record.recentUnitsSold) ?? 0),
          ];
        })
        .filter((row): row is string[] => Boolean(row));

      return {
        chart: {
          data: opportunities
            .map((item) => {
              const record = asRecord(item);
              if (!record || typeof record.name !== "string") return null;
              return {
                current: asNumber(record.recentUnitsSold) ?? 0,
                label: record.name,
              };
            })
            .filter((item): item is ChartDatum => Boolean(item)),
        },
        filters: [`Umbral de stock: ${threshold} unidades`, "Las ventas recientes ordenan la urgencia"],
        metrics: [
          { label: "Variantes marcadas", value: formatScalar(rows.length) },
          {
            label: "Sin stock ahora",
            value: formatScalar(opportunities.filter((item) => (asNumber(asRecord(item)?.stock) ?? 0) <= 0).length),
          },
          { label: "Umbral", value: `${threshold} unidades` },
        ],
        source: "Tiendanube · Productos + demanda de órdenes",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Producto", "SKU", "Stock", "Ventas recientes"],
          rows,
        },
        title: buildIntentTitle(primary.toolName, userQuestion, { isSkuRisk: asksForSkuRisk }),
        userQuestion,
        windowLabel: "Stock actual",
      };
    }
    default:
      return {
        chart: null,
        filters: ["Respuesta validada por backend"],
        metrics: result.evidence.slice(0, 4).map((item) => ({
          helper: item.period,
          label: item.metric,
          value: formatScalar(item.value),
        })),
        source: "Tiendanube",
        summary: result.answer,
        summaryPoints: result.recommendedActions,
        table: {
          columns: ["Métrica", "Valor", "Período"],
          rows: result.evidence.map((item) => [item.metric, formatScalar(item.value), item.period ?? "-"]),
        },
        title: buildIntentTitle(primary.toolName, userQuestion),
        userQuestion,
        windowLabel: "Datos sincronizados actuales",
      };
  }
}

function EmptyCanvas() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-12 text-center">
      <div className="surface-card mb-7 inline-flex h-18 w-18 items-center justify-center rounded-[1.75rem] border-border-strong bg-card">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-display text-[4.25rem] leading-[0.92] text-foreground">Tu panel de análisis</h2>
      <p className="mt-6 max-w-2xl text-[1.45rem] leading-10 text-muted-foreground">
        Hacé una pregunta a la izquierda y el reporte completo — KPIs, gráfico, tabla y capa de confianza — aparece acá,
        al lado de la conversación.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {[
          ["Chat", "para preguntar"],
          ["Canvas", "para inspeccionar"],
          ["Confianza", "para verificar"],
        ].map(([title, subtitle]) => (
          <div key={title} className="surface-card rounded-[1.4rem] px-9 py-4 text-center">
            <p className="text-[1.15rem] font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingCanvas() {
  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-muted" />
            <div className="h-16 w-3/4 rounded-2xl bg-muted" />
            <div className="h-8 w-2/3 rounded-xl bg-muted" />
          </div>

          {/* Metrics skeleton */}
          <div className="grid gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card rounded-3xl p-5 space-y-3">
                <div className="h-3 w-20 rounded-full bg-muted" />
                <div className="h-10 w-32 rounded-lg bg-muted" />
              </div>
            ))}
          </div>

          {/* Summary section skeleton */}
          <div className="surface-card rounded-[1.6rem] bg-accent/15 p-5">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-full rounded-lg bg-muted" />
                <div className="h-5 w-5/6 rounded-lg bg-muted" />
              </div>
            </div>
          </div>

          {/* Chart/Table section skeleton */}
          <div className="surface-card rounded-[1.6rem] overflow-hidden">
            <div className="flex items-center gap-8 border-b border-border px-5 py-4">
              {["Gráfico", "Tabla", "Resumen"].map((label) => (
                <div key={label} className="h-5 w-16 rounded-lg bg-muted" />
              ))}
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ chart }: { chart: ChartModel }) {
  const maxValue = chart.data.reduce((highest, item) => {
    return Math.max(highest, item.current, item.previous ?? 0);
  }, 0);

  return (
    <div className="mt-5 rounded-[1.5rem] bg-muted p-4">
      <div className="flex h-48 items-stretch gap-3">
        {chart.data.map((item) => {
          const currentHeight = maxValue > 0 ? Math.max((item.current / maxValue) * 100, 8) : 8;
          const previousHeight = item.previous != null ? Math.max(((item.previous ?? 0) / maxValue) * 100, 8) : 0;

          return (
            <div key={item.label} className="flex min-w-0 h-full flex-1 flex-col items-center justify-end gap-3">
              <div className="flex h-full w-full min-h-0 items-end justify-center gap-2">
                {item.previous != null ? (
                  <div
                    className="w-full max-w-8 rounded-t-2xl bg-secondary"
                    style={{ height: `${previousHeight}%` }}
                    title={`${chart.previousLabel ?? "Anterior"} · ${item.label}`}
                  />
                ) : null}
                <div
                  className="w-full max-w-8 rounded-t-2xl bg-accent"
                  style={{ height: `${currentHeight}%` }}
                  title={`${chart.currentLabel ?? "Actual"} · ${item.label}`}
                />
              </div>
              <p className="line-clamp-2 text-center text-xs leading-4 text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
      {(chart.currentLabel || chart.previousLabel) ? (
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {chart.previousLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-secondary" />
              {chart.previousLabel}
            </span>
          ) : null}
          {chart.currentLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-accent" />
              {chart.currentLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReportPreviewCard({
  model,
  onOpenAnalysis,
  onCopiarSummary,
}: {
  model: CanvasModel;
  onCopiarSummary: () => void;
  onOpenAnalysis: () => void;
}) {
  return (
    <article className="surface-card-strong overflow-hidden rounded-[1.75rem]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Reporte | Tiendanube
            </div>
            <h3 className="font-display mt-3 text-[2.05rem] leading-[0.95] text-foreground">{model.title}</h3>
          </div>
          <button
            type="button"
            onClick={onOpenAnalysis}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
            aria-label="Abrir análisis"
          >
            <ChartColumn className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-5 overflow-hidden">
          <p className="max-h-[6.5rem] pr-2 text-[1.08rem] leading-8 text-foreground/88">{model.summary}</p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/92 to-transparent" />
        </div>
      </div>

      <div className="border-t border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <button type="button" className="inline-flex items-center gap-2 transition hover:text-foreground">
              <Pin className="h-4 w-4" />
              Fijar
            </button>
            <button type="button" className="inline-flex items-center gap-2 transition hover:text-foreground">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={onCopiarSummary}
              className="inline-flex items-center gap-2 transition hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAnalysis}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Abrir análisis
          </button>
        </div>

        {model.summaryPoints.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Siguientes preguntas sugeridas
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.summaryPoints.slice(0, 3).map((item) => (
                <span key={item} className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm leading-5 text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AnalysisCanvas({
  lastSyncLabel,
  model,
  isPending = false,
}: {
  lastSyncLabel: string;
  model: CanvasModel | null;
  isPending?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chart" | "summary" | "table">("chart");
  const [showTrust, setShowTrust] = useState(false);
  const [isVisible, setIsVisible] = useState(!!model);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevModelRef = useRef<CanvasModel | null>(model);

  // Scroll to top when model changes
  useEffect(() => {
    if (containerRef.current && model) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [model]);

  // Trigger fade-in animation when model changes
  useEffect(() => {
    if (model && prevModelRef.current?.title !== model.title) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
    prevModelRef.current = model;
  }, [model?.title, model]);

  if (isPending) {
    return <LoadingCanvas />;
  }

  if (!model) {
    return <EmptyCanvas />;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-8 py-7">
      <div className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="teal-soft inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium">
              <Store className="h-3.5 w-3.5" />
              Tiendanube
            </span>
            <span>{model.windowLabel}</span>
            <span>{lastSyncLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-foreground">
            <button type="button" className="inline-flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Fijar
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Imagen
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>
        </div>

        <header className="mt-4">
          <h1 className="font-display max-w-3xl text-[4rem] leading-[0.9] text-foreground">{model.title}</h1>
          <p className="mt-3 max-w-3xl text-[1.75rem] italic leading-9 text-muted-foreground">&quot;{model.userQuestion}&quot;</p>
        </header>

        {model.metrics.length > 0 ? (
          <section className="mt-8 grid gap-4 xl:grid-cols-4">
            {model.metrics.map((metric) => (
              <article key={metric.label} className="surface-card rounded-[1.5rem] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-[3rem] font-semibold text-foreground">{metric.value}</p>
                {metric.helper ? <p className="mt-3 text-[0.95rem] text-success">{metric.helper}</p> : null}
              </article>
            ))}
          </section>
        ) : null}

        <section className="surface-card mt-6 rounded-[1.6rem] border-border-strong bg-accent/15 px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card/70">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Resumen IA</p>
              <p className="mt-2 text-[1.55rem] leading-10 text-foreground">{model.summary}</p>
            </div>
          </div>
        </section>

        <section className="surface-card mt-6 rounded-[1.6rem] overflow-hidden">
          <div className="flex items-center gap-8 border-b border-border px-5">
            {[
              ["chart", "Gráfico"],
              ["table", "Tabla"],
              ["summary", "Resumen"],
            ].map(([key, label]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as "chart" | "summary" | "table")}
                  className={`border-b-2 px-1 py-4 text-lg transition ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === "chart" ? (
              model.chart ? (
                <MiniBarChart chart={model.chart} />
              ) : (
                <div className="rounded-[1.25rem] bg-muted p-8 text-center text-muted-foreground">
                  No hay gráfico disponible para esta respuesta.
                </div>
              )
            ) : null}

            {activeTab === "table" ? (
              model.table ? (
                <div className="overflow-x-auto rounded-[1.25rem] border border-border">
                  <table className="min-w-full text-left">
                    <thead className="bg-muted">
                      <tr>
                        {model.table.columns.map((column) => (
                          <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {model.table.rows.map((row, rowIndex) => (
                        <tr key={`${rowIndex}-${row[0]}`} className="border-t border-border">
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 text-base text-foreground">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-[1.25rem] bg-muted p-8 text-center text-muted-foreground">
                  No hay tabla disponible para esta respuesta.
                </div>
              )
            ) : null}

            {activeTab === "summary" ? (
              <div className="rounded-[1.25rem] bg-muted p-6">
                <p className="text-[1.35rem] leading-9 text-foreground">{model.summary}</p>
                {model.summaryPoints.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {model.summaryPoints.map((point) => (
                      <li key={point} className="flex gap-3 text-[1.1rem] leading-8 text-foreground">
                        <span className="mt-3 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="surface-card mt-6 rounded-[1.6rem] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTrust((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15">
                <Store className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">Confianza y trazabilidad</p>
                <p className="text-base text-muted-foreground">Verificá cómo se construyó esta respuesta</p>
              </div>
            </div>
            <span className="text-2xl text-muted-foreground">{showTrust ? "−" : "+"}</span>
          </button>

          {showTrust ? (
            <div className="border-t border-border px-5 py-5">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fuente</p>
                    <p className="mt-2 text-xl text-foreground">{model.source}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filtros aplicados</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {model.filters.map((filter) => (
                        <span key={filter} className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-foreground">
                          {filter}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rango de fechas</p>
                    <p className="mt-2 text-xl text-foreground">{model.windowLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Última sincronización</p>
                    <p className="mt-2 text-xl text-foreground">{lastSyncLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cómo se calculó</p>
                <p className="mt-2 text-lg leading-8 text-foreground">
                  Esta respuesta se basa en métricas SQL del backend obtenidas desde datos sincronizados de Tiendanube. La IA explica el resultado, pero los números provienen de consultas determinísticas de la aplicación.
                </p>
              </div>

              {showDebugEvidence && model.table ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vista previa de filas</p>
                  <div className="mt-3 overflow-x-auto rounded-[1.25rem] border border-border">
                    <table className="min-w-full text-left">
                      <thead className="bg-muted">
                        <tr>
                          {model.table.columns.map((column) => (
                            <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {model.table.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`${rowIndex}-${row[0]}`} className="border-t border-border">
                            {row.map((cell, cellIndex) => (
                              <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 text-base text-foreground">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({
  hasConnection,
  initialInput = "",
  lastSyncAt,
  storeName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [latestResult, setLatestResult] = useState<AnalystResponse | null>(null);
  const [latestQuestion, setLatestQuestion] = useState("");
  const [copyState, setCopyState] = useState<"done" | "idle">("idle");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const canvasModel = useMemo(
    () => buildCanvasModel(latestResult, latestQuestion),
    [latestQuestion, latestResult],
  );
  const lastAssistantIndex = [...messages].reverse().findIndex((message) => message.role === "assistant");
  const resolvedLastAssistantIndex =
    lastAssistantIndex === -1 ? -1 : messages.length - 1 - lastAssistantIndex;
  const lastSyncLabel = getLastSyncLabel(lastSyncAt);

  // Scroll to bottom when messages or pending state changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          behavior: "smooth",
          top: messagesContainerRef.current?.scrollHeight ?? 0,
        });
      }, 0);
    }
  }, [messages, isPending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isPending) {
      return;
    }

    await submitPrompt(trimmedInput);
  }

  async function submitPrompt(trimmedInput: string) {
    if (!trimmedInput || isPending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmedInput }];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsPending(true);
    setLatestQuestion(trimmedInput);

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({ messages: nextMessages }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            result: AnalystResponse;
          }
        | {
            message?: string;
            ok: false;
          };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Fallo la solicitud del chat." : (payload.message ?? "Fallo la solicitud del chat."));
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.result.answer,
        },
      ]);
      setLatestResult(payload.result);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Fallo la solicitud del chat.";
      setError(message);
      setMessages((current) =>
        current.filter(
          (message, index) =>
            !(index === current.length - 1 && message.role === "user" && message.content === trimmedInput),
        ),
      );
      setInput(trimmedInput);
    } finally {
      setIsPending(false);
    }
  }

  async function handleCopiarSummary() {
    if (!canvasModel) {
      return;
    }

    await navigator.clipboard.writeText(`${canvasModel.title}\n\n${canvasModel.summary}`);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handlePromptClick(prompt: string) {
    await submitPrompt(prompt);
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[minmax(360px,38%)_minmax(0,1fr)] lg:overflow-hidden">
      <section className="flex min-h-screen flex-col border-r border-border bg-card lg:h-screen lg:overflow-hidden">
        <header className="shrink-0 flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[1.85rem] font-semibold tracking-[-0.03em] text-foreground">Analista IA de Negocio</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                {storeName} · Tiendanube
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted">
              <LayoutGrid className="h-4.5 w-4.5" />
            </button>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-between gap-10">
              <div className="max-w-xl pt-8">
           
                                <h1 className="max-w-md text-[3.35rem] font-semibold leading-[0.95] tracking-[-0.05em] text-foreground">
                  Hola, preguntame sobre tu tienda.
                </h1>
                <p className="mt-4 text-[1rem] text-muted-foreground">
                  {hasConnection ? `${lastSyncLabel}.` : "Primero conectá tu tienda Tiendanube."}
                </p>
              </div>

              <div className="max-w-xl space-y-4 pb-2">
                {emptyStatePrompts.map((item) => (
                  <div key={item.prompt}>
                    <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${item.tone}`}>{item.label}</p>
                    <button
                      type="button"
                      onClick={() => handlePromptClick(item.prompt)}
                      className="mt-3 flex w-full cursor-pointer items-center rounded-[1.35rem] border border-border-strong bg-card px-5 py-4 text-left text-[1.05rem] text-foreground shadow-sm transition hover:border-accent hover:bg-muted"
                    >
                      {item.prompt}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) => {
                const isLastStructuredAssistant =
                  message.role === "assistant" && index === resolvedLastAssistantIndex && canvasModel;

                if (message.role === "user") {
                  return (
                    <div key={`${message.role}-${index}`} className="flex justify-end">
                      <div className="max-w-[82%] rounded-[1.45rem] bg-primary px-5 py-3 text-xl font-medium text-primary-foreground">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                if (isLastStructuredAssistant && canvasModel) {
                  return (
                    <div key={`${message.role}-${index}`} className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                          <Sparkles className="h-4 w-4 text-accent" />
                        </div>
                        <p className="max-w-lg text-[1.05rem] leading-8 text-foreground">
                          Esto es lo que encontré. Tomé pedidos pagos de Tiendanube y los comparé contra la ventana anterior.
                        </p>
                      </div>
                      <ReportPreviewCard
                        model={canvasModel}
                        onCopiarSummary={handleCopiarSummary}
                        onOpenAnalysis={() => window.scrollTo({ behavior: "smooth", top: 0 })}
                      />
                    </div>
                  );
                }

                return (
                  <div key={`${message.role}-${index}`} className="flex justify-start">
                    <div className="max-w-[85%] rounded-[1.45rem] border border-border bg-muted px-4 py-3 text-base leading-7 text-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {isPending ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-[1.05rem] leading-8 text-muted-foreground">
                      Analizando datos sincronizados de la tienda...
                    </p>
                  </div>
                  <div className="surface-card rounded-[1.75rem] p-5">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 w-40 rounded-full bg-muted" />
                      <div className="h-10 w-3/4 rounded-2xl bg-muted" />
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, itemIndex) => (
                          <div key={itemIndex} className="h-28 rounded-[1.25rem] bg-muted" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-5">
          <form onSubmit={handleSubmit} className="surface-card rounded-[1.65rem] p-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Preguntá lo que quieras sobre tu tienda..."
              className="min-h-28 w-full resize-none bg-transparent text-[1.18rem] leading-8 text-foreground outline-none placeholder:text-muted-foreground"
              disabled={isPending}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">↵ to send · ⇧↵ for new line</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>
          {copyState === "done" ? <p className="mt-2 text-right text-sm text-emerald-600">Resumen copiado.</p> : null}
        </div>
      </section>

      <aside className={`hidden h-screen overflow-y-auto bg-background transition-opacity duration-300 lg:block ${canvasModel || isPending ? "opacity-100" : "opacity-60"}`}>
        <AnalysisCanvas lastSyncLabel={lastSyncLabel} model={canvasModel} isPending={isPending} />
      </aside>
    </div>
  );
}
