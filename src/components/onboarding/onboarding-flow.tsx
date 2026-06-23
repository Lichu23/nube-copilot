"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Megaphone,
  PackageSearch,
  Repeat2,
  Sparkles,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { saveAnalystPreferences } from "@/lib/analyst/preferences";

type OnboardingFlowProps = {
  detectedOrderCount: number;
  storeId?: string;
  storeName?: string;
};

type Choice = {
  description: string;
  icon?: typeof Store;
  label: string;
  value: string;
};

const roles = ["Dueño/a", "Manager", "Marketing", "Operaciones", "Otro"];

const categories = [
  "Indumentaria",
  "Belleza",
  "Hogar",
  "Electrónica",
  "Alimentos",
  "Salud",
  "Deportes",
  "Otro",
];

const stages: Choice[] = [
  { description: "Menos de un año, validando demanda.", label: "Empezando", value: "Empezando" },
  { description: "Ventas creciendo y operación en escala.", label: "Creciendo", value: "Creciendo" },
  { description: "Volumen estable, optimizando margen.", label: "Establecida", value: "Establecida" },
];

const goals: Choice[] = [
  { description: "Encontrar qué empuja el crecimiento.", icon: BarChart3, label: "Aumentar ingresos", value: "Aumentar ingresos" },
  { description: "Detectar riesgo de inventario temprano.", icon: PackageSearch, label: "Evitar quiebres de stock", value: "Evitar quiebres de stock" },
  { description: "Ver qué productos mueven la aguja.", icon: Sparkles, label: "Entender productos estrella", value: "Entender productos estrella" },
  { description: "Encontrar patrones en clientes que vuelven.", icon: Repeat2, label: "Mejorar recompra", value: "Mejorar recompra" },
  { description: "Identificar SKUs que ocupan capital.", icon: Store, label: "Reducir inventario lento", value: "Reducir inventario lento" },
];

const frictions: Choice[] = [
  { description: "Pronosticar demanda tarda demasiado.", icon: PackageSearch, label: "Saber qué reponer", value: "Saber qué reponer" },
  { description: "Picos y caídas sin causa clara.", icon: Sparkles, label: "Entender por qué cambian las ventas", value: "Entender por qué cambian las ventas" },
  { description: "Lentos escondidos en el catálogo.", icon: Store, label: "Encontrar productos que no se mueven", value: "Encontrar productos que no se mueven" },
  { description: "Copiar números y armar reportes.", icon: BarChart3, label: "Preparar reportes", value: "Preparar reportes" },
  { description: "Elegir el producto correcto a tiempo.", icon: Megaphone, label: "Decidir qué promocionar", value: "Decidir qué promocionar" },
];

const cadences: Choice[] = [
  { description: "Un resumen cada mañana.", label: "Diario", value: "Diario" },
  { description: "Un cierre enfocado cada lunes.", label: "Semanal", value: "Semanal" },
  { description: "Una lectura profunda mensual.", label: "Mensual", value: "Mensual" },
];

const tones: Choice[] = [
  { description: "Respuestas cortas y números primero.", label: "Directo", value: "Directo" },
  { description: "Contexto, evidencia y razonamiento.", label: "Detallado", value: "Detallado" },
  { description: "Siempre termina con próximos pasos.", label: "Accionable", value: "Accionable" },
];

function inferVolume(orderCount: number) {
  if (orderCount >= 5000) return "5k+ pedidos";
  if (orderCount >= 1000) return "1k-5k pedidos";
  if (orderCount >= 250) return "250-1k pedidos";
  if (orderCount >= 50) return "50-250 pedidos";
  if (orderCount > 0) return "0-50 pedidos";
  return "A detectar";
}

function BrandHeader({ storeId }: { storeId?: string }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-navy !text-white shadow-soft">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <span className="font-semibold text-foreground">NubeCopilot</span>
        <span className="text-sm text-muted-foreground">para Tiendanube</span>
      </Link>
      <Link href={storeId ? `/chat?storeId=${storeId}` : "/chat"} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
        Omitir por ahora
      </Link>
    </header>
  );
}

function OptionButton({
  choice,
  selected,
  onClick,
}: {
  choice: Choice;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = choice.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-[1rem] border p-4 text-left transition ${
        selected ? "border-ink-navy bg-white shadow-card" : "border-border bg-card hover:border-border-strong"
      }`}
    >
      {Icon ? (
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] ${selected ? "bg-ink-navy !text-white" : "bg-muted text-ink-navy"}`}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{choice.label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{choice.description}</span>
      </span>
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-ink-navy bg-ink-navy !text-white" : "border-border bg-white"}`}>
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

export function OnboardingFlow({ detectedOrderCount, storeId, storeName }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Dueño/a");
  const [category, setCategory] = useState("Indumentaria");
  const [stage, setStage] = useState("Creciendo");
  const [goal, setGoal] = useState("Reducir inventario lento");
  const [friction, setFriction] = useState("Saber qué reponer");
  const [cadence, setCadence] = useState("Semanal");
  const [tone, setTone] = useState("Detallado");
  const volume = useMemo(() => inferVolume(detectedOrderCount), [detectedOrderCount]);
  const canContinue = step !== 0 || name.trim().length > 1;
  const progress = Math.round(((step + 1) / 5) * 100);

  useEffect(() => {
    if (step !== 5) return;

    void saveAnalystPreferences({
      cadence,
      category,
      completedAt: new Date().toISOString(),
      friction,
      goal,
      name: name.trim(),
      role,
      stage,
      tone,
      volume,
    }).catch(() => {
      // The settings page can retry persistence if the store connection is missing.
    });
  }, [cadence, category, friction, goal, name, role, stage, step, tone, volume]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[34rem] max-w-3xl rounded-full bg-accent/70 blur-3xl" />
      <BrandHeader storeId={storeId} />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6">
        {step < 5 ? (
          <div className="mb-12">
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Paso {step + 1} de 5</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-ink-navy transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {step === 0 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Sobre vos</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">Empecemos por lo básico.</h1>
            <p className="mt-5 text-lg text-muted-foreground">Así tu analista sabe con quién está hablando.</p>

            <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
              <label className="block text-sm font-semibold text-foreground">
                Tu nombre
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Lucía Martínez"
                  className="mt-4 w-full rounded-[1rem] border border-input bg-white px-5 py-4 text-base outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>
              <div className="mt-8">
                <p className="text-sm font-semibold text-foreground">Tu rol</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {roles.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                        role === item ? "border-ink-navy bg-ink-navy !text-white" : "border-border bg-white text-foreground hover:border-border-strong"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Tu tienda</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">Contanos del negocio.</h1>
            <p className="mt-5 text-lg text-muted-foreground">Pocos datos, mejores recomendaciones. El volumen lo inferimos de tu sincronización.</p>

            <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
              <p className="text-sm font-semibold text-foreground">Categoría</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${
                      category === item ? "border-ink-navy bg-ink-navy !text-white" : "border-border bg-white text-foreground hover:border-border-strong"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <p className="mt-8 text-sm font-semibold text-foreground">Etapa del negocio</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {stages.map((item) => (
                  <OptionButton key={item.value} choice={item} selected={stage === item.value} onClick={() => setStage(item.value)} />
                ))}
              </div>

              <div className="mt-6 rounded-[1rem] border border-border bg-surface-muted p-5">
                <p className="text-sm font-semibold text-foreground">Volumen detectado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {storeName ? `${storeName}: ` : null}
                  {volume}. Lo vamos a recalcular con cada sincronización.
                </p>
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Objetivo principal</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">¿Qué querés mejorar primero?</h1>
            <p className="mt-5 text-lg text-muted-foreground">Elegí uno. Después podés cambiar el foco.</p>
            <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
              <div className="grid gap-3">
                {goals.map((item) => (
                  <OptionButton key={item.value} choice={item} selected={goal === item.value} onClick={() => setGoal(item.value)} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Fricción principal</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">¿Qué te saca más tiempo?</h1>
            <p className="mt-5 text-lg text-muted-foreground">Esto ordena la prioridad del panel y del chat.</p>
            <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
              <div className="grid gap-3">
                {frictions.map((item) => (
                  <OptionButton key={item.value} choice={item} selected={friction === item.value} onClick={() => setFriction(item.value)} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Cómo reportamos</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">¿Cómo querés escuchar a tu analista?</h1>
            <p className="mt-5 text-lg text-muted-foreground">Cadencia y tono. Lo podés ajustar después.</p>
            <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-8 shadow-card">
              <p className="text-sm font-semibold text-foreground">Cadencia</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {cadences.map((item) => (
                  <OptionButton key={item.value} choice={item} selected={cadence === item.value} onClick={() => setCadence(item.value)} />
                ))}
              </div>
              <p className="mt-8 text-sm font-semibold text-foreground">Tono</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {tones.map((item) => (
                  <OptionButton key={item.value} choice={item} selected={tone === item.value} onClick={() => setTone(item.value)} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Todo listo</p>
            <h1 className="font-display mt-4 text-[4rem] leading-[0.9] tracking-[-0.055em] text-heading-ink">Así va a trabajar tu analista.</h1>
            <p className="mt-5 text-lg text-muted-foreground">Guardamos estas preferencias en este navegador para personalizar el chat, el panel y los ajustes.</p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-card">
              <div className="border-b border-border p-8">
                <div className="flex gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-navy !text-white">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tu analista va a enfocarse en</p>
                    <p className="font-display mt-2 text-2xl leading-tight text-heading-ink">
                      {goal.toLowerCase()}, con prioridad en {friction.toLowerCase()}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-8 md:grid-cols-2">
                {[
                  ["Nombre y rol", `${name || "Tu nombre"} · ${role}`],
                  ["Tienda", `${category} · ${stage} · ${volume}`],
                  ["Objetivo", goal],
                  ["Reporte", `${cadence} · ${tone}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1rem] border border-border bg-surface-muted p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {label}
                    </p>
                    <p className="mt-2 font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>

          {step === 5 ? (
            <Link href={storeId ? `/chat?storeId=${storeId}` : "/chat"} className="inline-flex items-center gap-2 rounded-[1rem] btn-ink px-7 py-4 text-sm font-semibold shadow-card transition">
              Ir al analista
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(5, current + 1))}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 rounded-[1rem] btn-ink px-7 py-4 text-sm font-semibold shadow-card transition disabled:cursor-not-allowed disabled:bg-muted-foreground"
            >
              {step === 4 ? "Revisar" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
