import { MetricCard } from "@/components/dashboard/metric-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell
      eyebrow="Dashboard"
      title="Trust layer for the AI analyst"
      description="The dashboard exists so merchants can verify the numbers behind every recommendation."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Revenue this week" value="$0" helper="Connect a store to load real data." />
        <MetricCard label="Orders this week" value="0" helper="Waiting for initial sync." />
        <MetricCard label="Average order value" value="$0" helper="Computed from normalized orders." />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SalesTrendChart />
        <InsightCard
          title="Weekly snapshot"
          body="Insights will be generated from backend metrics after sync is implemented."
        />
      </section>

      <TopProductsTable />
    </AppShell>
  );
}
