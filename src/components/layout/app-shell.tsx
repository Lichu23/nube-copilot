import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/connect", label: "Connect" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
];

export function AppShell({ eyebrow, title, description, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold">NubeCopilot</p>
            <p className="text-xs text-zinc-500">Tiendanube AI business analyst MVP</p>
          </div>
          <nav className="flex gap-4 text-sm text-zinc-600">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-zinc-950">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-3xl text-base text-zinc-600">{description}</p>
        </section>
        {children}
      </main>
    </div>
  );
}
