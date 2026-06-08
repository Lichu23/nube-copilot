"use client";

type ToolResult = {
  input: unknown;
  output: unknown;
  toolCallId: string;
  toolName: string;
};

type ChartBar = {
  label: string;
  value: number;
  valueLabel: string;
};

type ChartModel = {
  bars: ChartBar[];
  subtitle: string;
  title: string;
};

function formatCurrency(value: number, currency: string | null | undefined) {
  return new Intl.NumberFormat("en", {
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildChartModel(item: ToolResult): ChartModel | null {
  const output = asRecord(item.output);

  if (!output) {
    return null;
  }

  if (item.toolName === "compare_periods") {
    const comparison = asRecord(output.comparison);
    const currentWindow = asRecord(output.currentWindow);
    const previousWindow = asRecord(output.previousWindow);
    const revenue = comparison ? asRecord(comparison.revenue) : null;

    if (!comparison || !revenue) {
      return null;
    }

    const currentRevenue = asNumber(revenue.current);
    const previousRevenue = asNumber(revenue.previous);
    const currency = typeof comparison.currency === "string" ? comparison.currency : null;
    const currentLabel =
      typeof currentWindow?.label === "string" ? currentWindow.label : "Current period";
    const previousLabel =
      typeof previousWindow?.label === "string" ? previousWindow.label : "Previous period";

    if (currentRevenue == null || previousRevenue == null) {
      return null;
    }

    return {
      bars: [
        { label: currentLabel, value: currentRevenue, valueLabel: formatCurrency(currentRevenue, currency) },
        { label: previousLabel, value: previousRevenue, valueLabel: formatCurrency(previousRevenue, currency) },
      ],
      subtitle: "Revenue comparison from real SQL metrics.",
      title: "Period revenue",
    };
  }

  if (item.toolName === "get_top_products") {
    const products = Array.isArray(output.products) ? output.products : [];
    const summary = asRecord(output.summary);
    const currency = summary && typeof summary.currency === "string" ? summary.currency : null;

    const bars = products
      .map((product) => {
        const record = asRecord(product);

        if (!record || typeof record.name !== "string") {
          return null;
        }

        const revenue = asNumber(record.revenue);

        if (revenue == null) {
          return null;
        }

        return {
          label: record.name,
          value: revenue,
          valueLabel: formatCurrency(revenue, currency),
        };
      })
      .filter((bar): bar is ChartBar => Boolean(bar));

    if (bars.length === 0) {
      return null;
    }

    return {
      bars,
      subtitle: "Revenue by top-selling products in the selected window.",
      title: "Top product revenue",
    };
  }

  if (item.toolName === "get_low_stock_opportunities") {
    const opportunities = Array.isArray(output.opportunities) ? output.opportunities : [];
    const bars = opportunities
      .map((opportunity) => {
        const record = asRecord(opportunity);

        if (!record || typeof record.name !== "string") {
          return null;
        }

        const recentUnitsSold = asNumber(record.recentUnitsSold);

        if (recentUnitsSold == null) {
          return null;
        }

        return {
          label: record.name,
          value: recentUnitsSold,
          valueLabel: `${recentUnitsSold} sold recently`,
        };
      })
      .filter((bar): bar is ChartBar => Boolean(bar));

    if (bars.length === 0) {
      return null;
    }

    return {
      bars,
      subtitle: "Recent units sold for the variants currently flagged as low stock.",
      title: "Low-stock demand",
    };
  }

  if (item.toolName === "get_sales_summary") {
    const summary = asRecord(output.summary);
    const window = asRecord(output.window);

    if (!summary) {
      return null;
    }

    const revenue = asNumber(summary.revenue);
    const orders = asNumber(summary.orderCount);
    const unitsSold = asNumber(summary.unitsSold);
    const currency = typeof summary.currency === "string" ? summary.currency : null;
    const days = typeof window?.days === "number" ? window.days : null;

    if (revenue == null || orders == null || unitsSold == null) {
      return null;
    }

    return {
      bars: [
        { label: "Revenue", value: revenue, valueLabel: formatCurrency(revenue, currency) },
        { label: "Orders", value: orders, valueLabel: `${orders} orders` },
        { label: "Units sold", value: unitsSold, valueLabel: `${unitsSold} units` },
      ],
      subtitle: days ? `Summary for the last ${days} days.` : "Summary for the selected window.",
      title: "Sales summary",
    };
  }

  if (item.toolName === "get_weekly_business_snapshot") {
    const summary = asRecord(output.summary);
    const summaryPayload = summary ? asRecord(summary.summary) : null;
    const comparison = asRecord(output.comparison);
    const comparisonPayload = comparison ? asRecord(comparison.comparison) : null;
    const revenue = summaryPayload ? asRecord(summaryPayload.revenue) : null;
    const comparisonRevenue = comparisonPayload ? asRecord(comparisonPayload.revenue) : null;
    const currentRevenue = revenue ? asNumber(revenue.current) : null;
    const previousRevenue = comparisonRevenue ? asNumber(comparisonRevenue.previous) : null;
    const currency = summaryPayload && typeof summaryPayload.currency === "string" ? summaryPayload.currency : null;

    if (currentRevenue == null || previousRevenue == null) {
      return null;
    }

    return {
      bars: [
        { label: "Last 7 days", value: currentRevenue, valueLabel: formatCurrency(currentRevenue, currency) },
        { label: "Previous 7 days", value: previousRevenue, valueLabel: formatCurrency(previousRevenue, currency) },
      ],
      subtitle: "Revenue trend used by the weekly snapshot.",
      title: "Weekly revenue trend",
    };
  }

  return null;
}

export function ToolResultChart({ items }: { items: ToolResult[] }) {
  const charts = items
    .map((item) => ({
      chart: buildChartModel(item),
      toolCallId: item.toolCallId,
    }))
    .filter((entry): entry is { chart: ChartModel; toolCallId: string } => Boolean(entry.chart));

  if (charts.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Structured chart output</h2>
      <p className="mt-2 text-sm text-zinc-600">Chart-ready views built from the backend evidence used in the answer.</p>

      <div className="mt-4 space-y-4">
        {charts.map(({ chart, toolCallId }) => {
          const maxValue = chart.bars.reduce((highest, bar) => Math.max(highest, bar.value), 0);

          return (
            <article key={toolCallId} className="rounded-2xl border border-black/10 p-4">
              <div className="mb-4">
                <h3 className="font-medium text-zinc-950">{chart.title}</h3>
                <p className="text-sm text-zinc-600">{chart.subtitle}</p>
              </div>

              <div className="space-y-3">
                {chart.bars.map((bar) => {
                  const width = maxValue > 0 ? Math.max((bar.value / maxValue) * 100, 6) : 6;

                  return (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-zinc-800">{bar.label}</span>
                        <span className="text-zinc-600">{bar.valueLabel}</span>
                      </div>
                      <div className="h-3 rounded-full bg-zinc-100">
                        <div className="h-3 rounded-full bg-zinc-950" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
