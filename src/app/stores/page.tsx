import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";

import { getStoreMembershipsForCurrentUser } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const memberships = await getStoreMembershipsForCurrentUser();

  if (memberships.length === 0) {
    redirect("/connect");
  }

  if (memberships.length === 1) {
    redirect(`/dashboard?storeId=${memberships[0].storeId}`);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tus tiendas</p>
        <h1 className="mt-3 text-4xl font-semibold">Elegí qué Tiendanube querés abrir</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Tu cuenta tiene más de una tienda asociada. Antes de entrar al analista, tenés que elegir el tenant correcto.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {memberships.map((membership) => (
            <article key={membership.storeId} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                  <Store className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{membership.storeName ?? "Tienda sin nombre"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tiendanube ID {membership.tiendanubeStoreId} · rol {membership.role}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {membership.country ?? "—"} · {membership.currency ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/dashboard?storeId=${membership.storeId}`}
                  className="inline-flex items-center gap-2 rounded-full btn-ink px-4 py-2 text-sm font-semibold shadow-sm transition"
                >
                  Abrir dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/chat?storeId=${membership.storeId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border-strong"
                >
                  Abrir chat
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
