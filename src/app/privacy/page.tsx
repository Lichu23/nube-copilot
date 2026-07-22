import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Política de Privacidad | NubeCopilot",
  description: "Política de privacidad de NubeCopilot.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
          ← Volver a NubeCopilot
        </Link>

        <div className="mt-10 space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Legal</p>
            <h1 className="mt-3 font-display text-5xl leading-none tracking-[-0.05em] text-heading-ink">
              Política de Privacidad
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">Última actualización: 22 de julio de 2026</p>
          </div>

          <div className="space-y-6 text-base leading-7 text-muted-foreground">
            <p>
              Esta política explica qué datos usa NubeCopilot para mostrar análisis, responder preguntas y mantener la conexión con una tienda Tiendanube.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Datos que puede leer la app</h2>
              <p>
                NubeCopilot puede leer información de la tienda, productos, variantes, stock, pedidos recientes, totales, estados, fechas e información necesaria para generar métricas e insights.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Cómo se usa la información</h2>
              <p>
                Los datos se usan para responder consultas en el chat, construir el dashboard, mostrar métricas y detectar señales como ventas, performance o riesgo de stock.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Acceso y tokens</h2>
              <p>
                La conexión con Tiendanube se realiza mediante OAuth. Los tokens de acceso se guardan del lado del servidor y se usan para sincronizar datos autorizados por el usuario.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Revocar acceso o pedir eliminación</h2>
              <p>
                Podés revocar el acceso a la tienda cuando quieras. También podés pedir eliminación de datos escribiendo a{" "}
                <a href="mailto:landingchee@gmail.com" className="font-medium text-primary hover:underline">
                  landingchee@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">GitHub</h2>
              <p>
                Podés ver el perfil del creador en{" "}
                <a href="https://github.com/Lichu23" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  github.com/Lichu23
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
