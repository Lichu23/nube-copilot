"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n/i18n-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  buttonLabel?: string;
  cooldownSeconds?: number;
  description?: string;
  emailLabel?: string;
  errorMessage?: string;
  helperMessage?: string;
  nextPath?: string;
  placeholder?: string;
  successMessage?: string;
  title?: string;
};

export function LoginForm({
  buttonLabel,
  cooldownSeconds = 45,
  description,
  emailLabel,
  errorMessage,
  helperMessage,
  nextPath = "/dashboard",
  placeholder,
  successMessage,
  title,
}: LoginFormProps) {
  const { messages } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      return undefined;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        setCooldownUntil(null);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    console.info("[auth] magic link request started", {
      nextPath,
      redirectTo,
      emailDomain: email.includes("@") ? email.split("@")[1] : null,
    });

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("[auth] magic link request failed", {
        code: error.code ?? null,
        message: error.message,
        status: error.status ?? null,
      });
      setCooldownUntil(null);
      setSecondsRemaining(0);
      setStatus("error");
      return;
    }

    console.info("[auth] magic link request accepted");
    setStatus("sent");
    setCooldownUntil(Date.now() + cooldownSeconds * 1000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{messages.auth.access}</p>
        <h1 className="text-3xl font-semibold text-foreground">{title ?? messages.auth.title}</h1>
        <p className="text-base leading-7 text-muted-foreground">{description ?? messages.auth.description}</p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-foreground">{emailLabel ?? messages.auth.email}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-[1rem] border border-input bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          placeholder={placeholder ?? messages.auth.placeholder}
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending" || secondsRemaining > 0}
        className="inline-flex w-full items-center justify-center rounded-[1rem] btn-ink px-5 py-3 text-sm font-semibold shadow-card transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending"
          ? messages.auth.sending
          : secondsRemaining > 0
            ? messages.auth.resendIn.replace("{seconds}", String(secondsRemaining))
            : buttonLabel ?? messages.auth.sendLink}
      </button>

      <p className="text-sm text-muted-foreground">
        {status === "sent"
          ? successMessage ?? messages.auth.success
          : status === "error"
            ? errorMessage ?? messages.auth.error
            : helperMessage ?? messages.auth.helper}
      </p>
    </form>
  );
}
