import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { AppShell } from "@/components/layout/app-shell";

const supportingLinks = [
  {
    href: "/connect",
    title: "Connect store",
    description: "Start the Tiendanube OAuth flow so the analyst can answer with real store data.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Review the trust layer with charts, metrics, and the weekly snapshot outside chat.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prompt = typeof params.prompt === "string" ? params.prompt : "";

  return (
    <AppShell
      eyebrow="AI analyst"
      title="Ask your store what happened, what changed, and what to do next."
      description="Chat is the primary product surface. The dashboard stays available as the trust layer behind the answers."
    >
      <ChatPanel initialInput={prompt} />

      <section className="grid gap-4 md:grid-cols-2">
        {supportingLinks.map((link) => (
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
