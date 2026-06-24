"use client";

import { Check } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getPreferenceSummary,
  preferenceOptions,
  saveAnalystPreferences,
  type AnalystPreferences,
} from "@/lib/analyst/preferences";

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function SelectField({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-[1rem] border border-input bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function AnalystSettingsForm({
  initialPreferences,
  storeId,
}: {
  initialPreferences: AnalystPreferences;
  storeId?: string;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [status, setStatus] = useState<"error" | "idle" | "saved" | "saving">("idle");

  function updatePreference<K extends keyof AnalystPreferences>(key: K, value: AnalystPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    try {
      const savedPreferences = await saveAnalystPreferences({
        ...preferences,
        completedAt: preferences.completedAt ?? new Date().toISOString(),
      }, storeId);
      setPreferences(savedPreferences);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="surface-card rounded-[1.6rem] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Rol">
            <SelectField value={preferences.role} options={preferenceOptions.roles} onChange={(value) => updatePreference("role", value)} />
          </Field>

          <Field label="Categoría">
            <SelectField value={preferences.category} options={preferenceOptions.categories} onChange={(value) => updatePreference("category", value)} />
          </Field>

          <Field label="Etapa">
            <SelectField value={preferences.stage} options={preferenceOptions.stages} onChange={(value) => updatePreference("stage", value)} />
          </Field>

          <Field label="Objetivo principal">
            <SelectField value={preferences.goal} options={preferenceOptions.goals} onChange={(value) => updatePreference("goal", value)} />
          </Field>

          <Field label="Fricción principal">
            <SelectField value={preferences.friction} options={preferenceOptions.frictions} onChange={(value) => updatePreference("friction", value)} />
          </Field>

          <Field label="Cadencia">
            <SelectField value={preferences.cadence} options={preferenceOptions.cadences} onChange={(value) => updatePreference("cadence", value)} />
          </Field>

          <Field label="Tono">
            <SelectField value={preferences.tone} options={preferenceOptions.tones} onChange={(value) => updatePreference("tone", value)} />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Guardando..." : "Guardar ajustes"}
          </Button>
          {status === "saved" ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
              <Check className="h-4 w-4" />
              Ajustes guardados.
            </span>
          ) : null}
          {status === "error" ? (
            <span className="text-sm font-semibold text-destructive">
              No se pudieron guardar. Verificá que haya una tienda conectada.
            </span>
          ) : null}
        </div>
      </section>

      <aside className="surface-card h-fit rounded-[1.6rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cómo cambia el producto</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-foreground">El analista prioriza lo que elegís.</h2>
        <p className="mt-4 text-muted-foreground">
          {getPreferenceSummary(preferences)} La pantalla inicial del chat, las sugerencias y la lectura del panel se ajustan con esta configuración.
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="rounded-[1rem] bg-surface-muted p-4">
            <dt className="font-semibold text-foreground">Reporte</dt>
            <dd className="mt-1 text-muted-foreground">
              {preferences.cadence} · {preferences.tone}
            </dd>
          </div>
          <div className="rounded-[1rem] bg-surface-muted p-4">
            <dt className="font-semibold text-foreground">Tienda</dt>
            <dd className="mt-1 text-muted-foreground">
              {preferences.category} · {preferences.stage}
            </dd>
          </div>
        </dl>
      </aside>
    </form>
  );
}
