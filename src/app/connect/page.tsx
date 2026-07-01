import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles, Store } from "lucide-react";

import { ConnectSyncPanel } from "@/components/connect/connect-sync-panel";
import { getActiveTiendanubeConnection, getDashboardSyncSummary, resolveActiveStoreId } from "@/lib/db/client";

const reasonCopy: Record<string, string> = {
  auth: "Tenés que iniciár sesión en la app antes de conectar una tienda.",
  config: "Falta configuración de OAuth o no es valida. Agrega las variables necesarias antes de volver a intentar.",
  exchange: "El callback llego a la app, pero fallo el intercambio del token o la persistencia.",
  ownership: "Esta cuenta ya esta vinculada a otra tienda. Por ahora la app permite una sola tienda por usuario.",
  state: "El estado del callback de OAuth faltaba o no era valido, asi que rechazamos la solicitud.",
};

function BrandHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-navy !text-white shadow-soft">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <span className="font-semibold text-foreground">NubeCopilot</span>
      </Link>
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <LockKeyhole className="h-4 w-4" />
        Cifrado en transito
      </p>
    </header>
  );
}

function ConnectCard({ errorReason }: { errorReason?: string }) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
      <div className="flex items-start gap-5">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-muted text-ink-navy">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tiendanube</h2>
          <p className="mt-2 text-base leading-7 text-muted-foreground">
            Te vamos a redirigir para autorizar NubeCopilot. Tarda unos segundos y volves automaticamente.
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-[1.25rem] border border-border bg-surface-muted p-5">
        {[
          "Leer perfil de tienda, productos, variantes e inventario",
          "Leer pedidos e items de pedidos de los ultimos 90 dias",
          "Anonimizar emails y teléfonos de clientes antes de guardarlos",
        ].map((item) => (
          <p key={item} className="flex gap-3 py-2 text-base text-foreground">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{item}</span>
          </p>
        ))}
      </div>

      {errorReason ? (
        <div className="mt-5 rounded-[1rem] border border-destructive/25 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">La conexión fallo</p>
          <p className="mt-1">{reasonCopy[errorReason] ?? "Error desconocido en el callback. Revisá los logs del servidor."}</p>
        </div>
      ) : null}

      <a
        href="/api/tiendanube/oauth/start"
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] btn-ink px-7 py-4 text-sm font-semibold shadow-card transition"
      >
        Autorizar Tiendanube
        <ArrowRight className="h-4 w-4" />
      </a>

      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Acceso solo lectura. Podés revocarlo desde tu administrador de Tiendanube.
      </p>
    </section>
  );
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.storeId === "string" ? params.storeId : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const autoSync = params.autoSync === "1";

  if (!status && !autoSync) {
    const resolvedStore = await resolveActiveStoreId(storeId).catch(() => null);
    const connection = resolvedStore
      ? await getActiveTiendanubeConnection(resolvedStore.storeId).catch(() => null)
      : null;

    if (connection) {
      redirect(`/dashboard?storeId=${encodeURIComponent(connection.storeId)}`);
    }
  }

  const resolvedStore = storeId ? await resolveActiveStoreId(storeId).catch(() => null) : null;
  const resolvedStoreId = resolvedStore?.storeId ?? storeId;
  const shouldLoadSummary = Boolean(resolvedStoreId) || status === "success" || autoSync;
  const summary = shouldLoadSummary ? await getDashboardSyncSummary(resolvedStoreId) : null;
  const hasConnection = Boolean(summary?.connection);
  const showSync = status === "success" || autoSync;

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[34rem] max-w-3xl rounded-full bg-accent/70 blur-3xl" />
      <BrandHeader />

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16">
        {hasConnection && !showSync ? (
          <div className="mx-auto mb-8 max-w-2xl rounded-[1.25rem] border border-border bg-surface-muted p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Conexión activa</p>
            <h3 className="mt-3 text-xl font-semibold text-foreground">
              {summary?.connection?.storeName ?? "Tu tienda"} ya esta conectada.
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Si querés autorizar otra cuenta de Tiendanube, iniciá de nuevo el flujo con el boton de abajo.
            </p>
          </div>
        ) : null}

        {showSync ? (
          <>
            <div className="mx-auto mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Sincronizando</p>
              <h1 className="font-display mt-4 text-[4.25rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">
                Leyendo tu tienda...
              </h1>
              <p className="mt-5 text-xl leading-8 text-muted-foreground">
                Esto suele tardar menos de un minuto. Podés dejar esta pestaña abierta.
              </p>
            </div>
            <ConnectSyncPanel
              autoRun={autoSync}
              hasConnection={hasConnection}
              orderCount={summary?.orderCount ?? 0}
              productCount={summary?.productCount ?? 0}
              storeId={summary?.connection?.storeId ?? resolvedStoreId}
              variantCount={summary?.variantCount ?? 0}
            />
          </>
        ) : (
          <>
            <div className="mx-auto mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Paso 1 de 2</p>
              <h1 className="font-display mt-4 text-[4.25rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">
                Conecta tu <span className="italic text-primary">Tiendanube</span>.
              </h1>
              <p className="mt-5 text-xl leading-8 text-muted-foreground">
                NubeCopilot lee tus datos de forma segura para responder con números reales. Nunca escribimos cambios en tu tienda.
              </p>
            </div>
            <ConnectCard errorReason={status === "error" ? reason : undefined} />
          </>
        )}
      </section>
    </main>
  );
}

