import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, LayoutDashboard, MessageSquare, Settings, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n/t";
import { defaultLocale } from "@/lib/i18n/messages";

export type AppShellActive = "chat" | "dashboard" | "saved" | "settings";

type AppShellProps = {
  active?: AppShellActive;
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  sidebarAction?: ReactNode;
  storeId?: string;
  children: ReactNode;
};

export const appNavigation = [
  { href: "/chat", label: t("navigation.analystChat"), key: "chat", icon: MessageSquare },
  { href: "/dashboard", label: t("navigation.dashboard"), key: "dashboard", icon: LayoutDashboard },
  { href: "/saved", label: t("navigation.saved"), key: "saved", icon: Bookmark },
  { href: "/settings", label: t("navigation.settings"), key: "settings", icon: Settings },
] as const;

function buildTenantHref(path: string, storeId?: string) {
  return storeId ? `${path}?storeId=${storeId}` : path;
}

export function AppSidebar({
  active = "dashboard",
  meta,
  sidebarAction,
  storeId,
}: {
  active?: AppShellActive;
  meta?: ReactNode;
  sidebarAction?: ReactNode;
  storeId?: string;
}) {
  return (
    <aside className="hidden border-r border-border bg-card px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
      <Link href={buildTenantHref("/chat", storeId)} className="flex items-center gap-3 px-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-navy !text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">{t("common.appName", defaultLocale)}</span>
      </Link>

      <div className="mt-5 px-2">
        <div className="text-sm font-semibold text-foreground">
          {meta ?? "Tiendanube conectada"}
        </div>
      </div>

      <nav className="mt-10 space-y-1">
        {appNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <Link
              key={item.href}
              href={buildTenantHref(item.href, storeId)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-surface-muted text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {sidebarAction ? <div className="mt-6">{sidebarAction}</div> : null}

      <Link
        href={buildTenantHref("/settings", storeId)}
        className="mt-auto inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-surface-muted"
      >
        Ajustar analista
      </Link>
    </aside>
  );
}

export function AppShell({
  active = "dashboard",
  eyebrow,
  title,
  description,
  meta,
  sidebarAction,
  storeId,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <AppSidebar active={active} meta={meta} sidebarAction={sidebarAction} storeId={storeId} />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center px-5">
            <p className="truncate text-sm font-semibold">{meta ?? "Tiendanube conectada"}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
            {appNavigation.map((item) => {
              const isActive = active === item.key;

              return (
                <Link
                  key={item.href}
                  href={buildTenantHref(item.href, storeId)}
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
          {sidebarAction ? <div className="px-5 pb-4 lg:hidden">{sidebarAction}</div> : null}
        </header>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-foreground">{title}</h1>
            <p className="max-w-3xl text-lg text-muted-foreground">{description}</p>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
