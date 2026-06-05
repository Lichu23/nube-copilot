import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";

const statusContent = {
  error: {
    description: "The connection did not complete. Review the reason below and try again.",
    title: "Connection failed",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  success: {
    description: "Tiendanube returned successfully and the connection was saved.",
    title: "Store connected",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
} as const;

const reasonCopy: Record<string, string> = {
  config: "Missing or invalid OAuth configuration. Add the required env values before trying again.",
  exchange: "The callback reached the app, but token exchange or persistence failed.",
  state: "The OAuth callback state was missing or invalid, so the request was rejected.",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const reasonParam = typeof params.reason === "string" ? params.reason : undefined;
  const status =
    statusParam === "success" || statusParam === "error" ? statusParam : undefined;
  const statusPanel = status ? statusContent[status] : null;

  return (
    <AppShell
      eyebrow="Connection"
      title="Connect a Tiendanube store"
      description="Start the Tiendanube OAuth flow, return safely to the app, and verify the connection result."
    >
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Install flow</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Use the secure server-side OAuth start route. The callback validates state, encrypts
            the token, and stores the connection before returning here.
          </p>
          <Link
            href="/api/tiendanube/oauth/start"
            className="mt-5 inline-flex rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Connect Tiendanube store
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">What this slice verifies</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>- state cookie issuance and validation</li>
            <li>- Tiendanube code exchange</li>
            <li>- encrypted token persistence</li>
            <li>- store and connection upsert</li>
          </ul>
        </div>
      </section>

      {statusPanel ? (
        <div className={`rounded-2xl border p-5 text-sm ${statusPanel.tone}`}>
          <p className="font-semibold">{statusPanel.title}</p>
          <p className="mt-1">{statusPanel.description}</p>
          {status === "error" && reasonParam ? (
            <p className="mt-3 text-sm">
              <span className="font-medium">Reason:</span>{" "}
              {reasonCopy[reasonParam] ?? "Unknown callback error. Check server logs for details."}
            </p>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
