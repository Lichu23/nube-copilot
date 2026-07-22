import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Términos de Servicio | NubeCopilot",
  description: "Términos de uso de NubeCopilot.",
};

export default function TermsPage() {
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
              Términos de Servicio
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">Última actualización: 22 de julio de 2026</p>
          </div>

          <div className="space-y-6 text-base leading-7 text-muted-foreground">
            <p>
              NubeCopilot es una herramienta en desarrollo que ayuda a analizar información de tiendas Tiendanube mediante un chat y un dashboard.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Uso de la app</h2>
              <p>
                Al usar NubeCopilot, aceptás usar la app de forma responsable y solo con tiendas o cuentas sobre las que tenés permiso de acceso.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Acceso a Tiendanube</h2>
              <p>
                La app se conecta a Tiendanube mediante OAuth. El acceso es de solo lectura y puede revocarse desde la cuenta o panel correspondiente.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Resultados generados por AI</h2>
              <p>
                Las respuestas del chat y los insights del dashboard pueden contener errores o interpretaciones incompletas. Usalos como apoyo para tomar decisiones, no como reemplazo de revisión humana.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Cambios del servicio</h2>
              <p>
                NubeCopilot puede cambiar, mejorar o interrumpir funciones mientras sigue en desarrollo.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Contacto</h2>
              <p>
                Para soporte o consultas sobre estos términos, escribí a{" "}
                <a href="mailto:landingchee@gmail.com" className="font-medium text-primary hover:underline">
                  landingchee@gmail.com
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
