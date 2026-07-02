"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { SyncControl } from "@/components/dashboard/sync-control";
import { AppSidebar, appNavigation, type AppShellActive } from "@/components/layout/app-shell";

type SidebarSummary = {
  connection: { storeId: string; storeName: string | null } | null;
  latestSyncFinishedAt: string | null;
  latestSyncMessage: string;
  latestSyncOutcome: string | null;
  latestSyncStatus: string | null;
  orderCount: number;
  productCount: number;
  storeId: string;
  storeName: string;
  variantCount: number;
};

function getActiveRoute(pathname: string): AppShellActive {
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/saved")) return "saved";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

function buildTenantHref(path: string, storeId?: string) {
  return storeId ? `${path}?storeId=${storeId}` : path;
}

function StoreMeta({ summary }: { summary: SidebarSummary | null }) {
  if (!summary) {
    return (
      <span className="flex flex-col gap-2">
        <span className="h-4 w-28 rounded-full bg-muted" />
        <span className="h-3 w-36 rounded-full bg-muted" />
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-0.5">
      <span>{summary.storeName}</span>
      <span className="text-xs font-medium text-muted-foreground">
        Tiendanube - {summary.connection ? "conectada" : "no conectada"}
      </span>
    </span>
  );
}

function SidebarAction({ autoRun, summary }: { autoRun?: boolean; summary: SidebarSummary | null }) {
  if (!summary) {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-background p-4">
        <div className="h-3 w-20 rounded-full bg-muted" />
        <div className="h-3 w-32 rounded-full bg-muted" />
        <div className="h-10 rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <SyncControl
      autoRun={autoRun}
      hasConnection={Boolean(summary.connection)}
      lastSyncFinishedAt={summary.latestSyncFinishedAt}
      lastSyncMessage={summary.latestSyncMessage}
      lastSyncOutcome={summary.latestSyncOutcome}
      lastSyncStatus={summary.latestSyncStatus}
      orderCount={summary.orderCount}
      productCount={summary.productCount}
      storeId={summary.connection?.storeId ?? summary.storeId}
      variant="sidebar"
      variantCount={summary.variantCount}
    />
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = getActiveRoute(pathname);
  const requestedStoreId = searchParams.get("storeId") ?? undefined;
  const autoSync = active === "dashboard" && searchParams.get("autoSync") === "1";
  const [summary, setSummary] = useState<SidebarSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (requestedStoreId) params.set("storeId", requestedStoreId);

    fetch(`/api/app/sidebar-summary?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SidebarSummary | null) => {
        if (data) setSummary(data);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Unable to load sidebar summary", error);
        }
      });

    return () => controller.abort();
  }, [requestedStoreId]);

  const resolvedStoreId = summary?.storeId ?? requestedStoreId;
  const meta = useMemo(() => <StoreMeta summary={summary} />, [summary]);
  const sidebarAction = useMemo(() => <SidebarAction autoRun={autoSync} summary={summary} />, [autoSync, summary]);

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <AppSidebar active={active} meta={meta} sidebarAction={sidebarAction} storeId={resolvedStoreId} />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center px-5">
            <p className="truncate text-sm font-semibold">{meta}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
            {appNavigation.map((item) => {
              const isActive = active === item.key;

              return (
                <Link
                  key={item.href}
                  href={buildTenantHref(item.href, resolvedStoreId)}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive ? "bg-ink-navy !text-white" : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 pb-4 lg:hidden">{sidebarAction}</div>
        </header>

        {children}
      </div>
    </div>
  );
}
