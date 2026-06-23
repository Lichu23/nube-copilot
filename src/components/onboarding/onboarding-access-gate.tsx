"use client";

import { Sparkles, Store } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

type OnboardingAccessGateProps = {
  storeId?: string;
  storeName?: string;
};

export function OnboardingAccessGate({ storeId, storeName }: OnboardingAccessGateProps) {
  const nextPath = storeId ? `/onboarding?storeId=${encodeURIComponent(storeId)}` : "/onboarding";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[34rem] max-w-3xl rounded-full bg-accent/70 blur-3xl" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-navy !text-white shadow-soft">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="font-semibold text-foreground">NubeCopilot</span>
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          Conectá primero tu tienda
        </p>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6">
        <div className="mb-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Paso 1: crear tu cuenta</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            {storeName ? `${storeName} ya está conectada.` : "Conectá tu tienda y después creá tu cuenta."}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Te vamos a mandar un enlace mágico para entrar sin contraseña. Cuando vuelvas, terminás el onboarding y seguimos con el dashboard.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
        <LoginForm
          buttonLabel="Enviar enlace mágico"
          cooldownSeconds={45}
          description="Ingresá tu email y te mandamos un enlace seguro para crear tu cuenta de NubeCopilot."
          emailLabel="Email de la cuenta"
          helperMessage="Te mandamos el enlace. Abrilo para verificar tu cuenta y seguir con el onboarding."
          nextPath={nextPath}
          placeholder="vos@tu-tienda.com"
          successMessage="Enlace enviado. Abrí tu email para verificar tu cuenta y continuar con el onboarding."
          title="Creá tu acceso"
        />
        </div>
      </section>
    </main>
  );
}
