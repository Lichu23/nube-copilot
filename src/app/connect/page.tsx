import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";

const statusContent = {
  error: {
    description: "La conexion no se completo. Revisa el motivo abajo y volve a intentar.",
    title: "La conexion fallo",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  success: {
    description: "Tiendanube respondio bien y guardamos la conexion.",
    title: "Tienda conectada",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
} as const;

const reasonCopy: Record<string, string> = {
  config: "Falta configuracion de OAuth o no es valida. Agrega las variables necesarias antes de volver a intentar.",
  exchange: "El callback llego a la app, pero fallo el intercambio del token o la persistencia.",
  state: "El estado del callback de OAuth faltaba o no era valido, asi que rechazamos la solicitud.",
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
      eyebrow="Conexion"
      title="Conecta una tienda Tiendanube"
      description="Inicia el flujo OAuth de Tiendanube, volve a la app de forma segura y verifica el resultado de la conexion."
    >
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Flujo de instalacion</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Usa la ruta segura del servidor para iniciar OAuth. El callback valida el estado,
            cifra el token y guarda la conexion antes de volver aca.
          </p>
          <Link
            href="/api/tiendanube/oauth/start"
            className="mt-5 inline-flex rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Conectar tienda Tiendanube
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Que valida esta pantalla</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>- emision y validacion de la cookie de estado</li>
            <li>- intercambio del codigo de Tiendanube</li>
            <li>- persistencia cifrada del token</li>
            <li>- upsert de tienda y conexion</li>
          </ul>
        </div>
      </section>

      {statusPanel ? (
        <div className={`rounded-2xl border p-5 text-sm ${statusPanel.tone}`}>
          <p className="font-semibold">{statusPanel.title}</p>
          <p className="mt-1">{statusPanel.description}</p>
          {status === "error" && reasonParam ? (
            <p className="mt-3 text-sm">
              <span className="font-medium">Motivo:</span>{" "}
              {reasonCopy[reasonParam] ?? "Error desconocido en el callback. Revisa los logs del servidor."}
            </p>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
