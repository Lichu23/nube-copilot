import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, Bookmark, LayoutDashboard, MessageSquare, Settings, Sparkles } from "lucide-react";

type AppShellProps = {
  active?: "chat" | "dashboard" | "saved" | "settings";
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  storeId?: string;
  children: ReactNode;
};

const navigation = [
  { href: "/chat", label: "Chat del analista", key: "chat", icon: MessageSquare },
  { href: "/dashboard", label: "Panel", key: "dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Guardados", key: "saved", icon: Bookmark },
  { href: "/settings", label: "Ajustes", key: "settings", icon: Settings },
] as const;

function buildTenantHref(path: string, storeId?: string) {
  return storeId ? `${path}?storeId=${storeId}` : path;
}

export function AppShell({ active = "dashboard", eyebrow, title, description, meta, storeId, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <Link href={buildTenantHref("/chat", storeId)} className="flex items-center gap-3 px-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-navy !text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">NubeCopilot</span>
        </Link>

        <nav className="mt-10 space-y-1">
          {navigation.map((item) => {
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

        <Link
          href={buildTenantHref("/settings", storeId)}
          className="mt-auto rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground transition hover:border-border-strong hover:text-foreground"
        >
          <span className="font-semibold text-foreground">Ajustar analista</span>
          <span className="mt-1 block">Objetivos, tono y frecuencia.</span>
        </Link>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-5 lg:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{meta ?? "La Tiendita ? Tiendanube ? conectada"}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-4.5 w-4.5" />
              <Link href={buildTenantHref("/settings", storeId)} aria-label="Ajustar analista" title="Ajustar analista">
                <Settings className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
            {navigation.map((item) => {
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
