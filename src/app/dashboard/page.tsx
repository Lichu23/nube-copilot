import { getDashboardSyncSummary } from "@/lib/db/client";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { SyncControl } from "@/components/dashboard/sync-control";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardPage() {
  const summary = await getDashboardSyncSummary();
  const latestSyncStatus = summary.latestSyncJob?.status ?? null;
  const latestSyncMetadata =
    summary.latestSyncJob?.metadata && typeof summary.latestSyncJob.metadata === "object"
      ? (summary.latestSyncJob.metadata as Record<string, unknown>)
      : null;
  const latestSyncMessage = summary.connection
    ? latestSyncStatus === "succeeded"
      ? `Latest sync captured ${summary.productCount} products and ${summary.variantCount} variants.`
      : latestSyncStatus === "failed"
        ? String(summary.latestSyncJob?.errorMessage ?? "Latest sync failed.")
        : "Ready to run your first sync."
    : "No Tiendanube connection found yet.";

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Trust layer for the AI analyst"
      description="The dashboard exists so merchants can verify the numbers behind every recommendation."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Revenue this week"
          value="$0"
          helper={summary.productCount > 0 ? "Catalog sync done. Orders sync is next." : "Connect and sync a store to load real data."}
        />
        <MetricCard
          label="Catalog products"
          value={String(summary.productCount)}
          helper={summary.connection ? "Products currently stored in Postgres." : "Waiting for store connection."}
        />
        <MetricCard
          label="Product variants"
          value={String(summary.variantCount)}
          helper={summary.connection ? "Variants normalized from Tiendanube payloads." : "Waiting for store connection."}
        />
      </section>

      <SyncControl
        hasConnection={Boolean(summary.connection)}
        lastSyncFinishedAt={summary.latestSyncJob?.finishedAt?.toISOString() ?? null}
        lastSyncMessage={latestSyncMessage}
        lastSyncStatus={latestSyncStatus}
        productCount={summary.productCount}
        storeId={summary.connection?.storeId}
        variantCount={summary.variantCount}
      />

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SalesTrendChart />
        <InsightCard
          title="Weekly snapshot"
          body={
            latestSyncStatus === "succeeded"
              ? `Latest sync completed successfully. Last job id: ${summary.latestSyncJob?.id}.`
              : latestSyncStatus === "failed"
                ? `The last sync failed. ${summary.latestSyncJob?.errorMessage ?? "Check the sync job details."}`
                : summary.connection
                  ? "Insights will improve after you sync products and then import orders."
                  : "Connect a store first, then sync products to start building insights."
          }
        />
      </section>

      <TopProductsTable
        helperLabel={
          latestSyncMetadata && typeof latestSyncMetadata.productCount === "number"
            ? `Latest sync imported ${latestSyncMetadata.productCount} products`
            : "Waiting for initial sync"
        }
      />
    </AppShell>
  );
}
