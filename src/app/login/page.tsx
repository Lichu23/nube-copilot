import Link from "next/link";
import { Sparkles } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-navy !text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-semibold">NubeCopilot</span>
        </Link>

        <section className="rounded-[1.6rem] border border-border bg-card p-8 shadow-card">
          <LoginForm
            buttonLabel="Enviar enlace de acceso"
            description="Te mandamos un enlace seguro por email. Abrílo para verificar tu cuenta y seguir en la app."
            helperMessage="Usamos un enlace magico para entrar sin contraseña."
            nextPath={nextPath}
            successMessage="Revisá tu email. Abrí el enlace para verificar tu cuenta y seguir."
            title="Entra a tu tienda"
          />
        </section>
      </div>
    </main>
  );
}

