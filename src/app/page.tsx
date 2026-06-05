import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

const quickLinks = [
  {
    href: "/connect",
    title: "Connect store",
    description: "Start the Tiendanube OAuth flow and manage store connections.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Review the trust layer with cards, charts, and operational tables.",
  },
  {
    href: "/chat",
    title: "AI chat",
    description: "Ask business questions and render structured evidence.",
  },
];

export default function HomePage() {
  return (
    <AppShell
      eyebrow="Tiendanube AI Business Analyst"
      title="Ask your store what happened, what changed, and what to do next."
      description="This scaffold is ready for OAuth, sync, metrics, and AI chat implementation."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:border-black/25"
          >
            <h2 className="text-lg font-semibold text-zinc-950">{link.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{link.description}</p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
