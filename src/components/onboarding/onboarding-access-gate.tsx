"use client";

import { Sparkles, Store } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { useI18n } from "@/lib/i18n/i18n-context";

type OnboardingAccessGateProps = {
  storeId?: string;
  storeName?: string;
};

export function OnboardingAccessGate({ storeId, storeName }: OnboardingAccessGateProps) {
  const { messages } = useI18n();
  const nextPath = storeId
    ? `/onboarding?storeId=${encodeURIComponent(storeId)}&flow=setup`
    : "/onboarding?flow=setup";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[34rem] max-w-3xl rounded-full bg-accent/70 blur-3xl" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-navy !text-white shadow-soft">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="font-semibold text-foreground">{messages.common.appName}</span>
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          Conectá primero tu tienda
        </p>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6">
        <div className="mb-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{messages.onboardingAccess.step1}</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            {storeName ? messages.onboardingAccess.connected.replace("{storeName}", storeName) : messages.onboardingAccess.connectFirst}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{messages.onboardingAccess.description}</p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
          <LoginForm
            buttonLabel={messages.onboardingAccess.sendMagicLink}
            cooldownSeconds={45}
            description={messages.onboardingAccess.emailDescription}
            emailLabel={messages.onboardingAccess.emailLabel}
            helperMessage={messages.onboardingAccess.helper}
            nextPath={nextPath}
            placeholder="vos@tu-tienda.com"
            successMessage={messages.onboardingAccess.success}
            title={messages.onboardingAccess.title}
          />
        </div>
      </section>
    </main>
  );
}
