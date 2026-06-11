"use client";

import { Copy, Download, Image as ImageIcon, Pin, Sparkles, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CanvasModel } from "@/lib/types";
import { EmptyCanvas } from "./empty-canvas";
import { LoadingCanvas } from "./loading-canvas";
import { MiniBarChart } from "./mini-bar-chart";

const showDebugEvidence =
  process.env.NEXT_PUBLIC_SHOW_CHAT_DEBUG_EVIDENCE === "true" || process.env.NODE_ENV !== "production";

export function AnalysisCanvas({
  lastSyncLabel,
  model,
  isPending = false,
}: {
  lastSyncLabel: string;
  model: CanvasModel | null;
  isPending?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chart" | "summary" | "table">("chart");
  const [showTrust, setShowTrust] = useState(false);
  const [isVisible, setIsVisible] = useState(!!model);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevModelRef = useRef<CanvasModel | null>(model);

  // Scroll to top when model changes
  useEffect(() => {
    if (containerRef.current && model) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [model]);

  // Trigger fade-in animation when model changes
  useEffect(() => {
    if (model && prevModelRef.current?.title !== model.title) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
    prevModelRef.current = model;
  }, [model?.title, model]);

  if (isPending) {
    return <LoadingCanvas />;
  }

  if (!model) {
    return <EmptyCanvas />;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-8 py-7">
      <div className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="teal-soft inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium">
              <Store className="h-3.5 w-3.5" />
              Tiendanube
            </span>
            <span>{model.windowLabel}</span>
            <span>{lastSyncLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-foreground">
            <button type="button" className="inline-flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Fijar
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Imagen
            </button>
            <button type="button" className="inline-flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>
        </div>

        <header className="mt-4">
          <h1 className="font-display max-w-3xl text-[4rem] leading-[0.9] text-foreground">{model.title}</h1>
          <p className="mt-3 max-w-3xl text-[1.75rem] italic leading-9 text-muted-foreground">&quot;{model.userQuestion}&quot;</p>
        </header>

        {model.metrics.length > 0 ? (
          <section className="mt-8 grid gap-4 xl:grid-cols-4">
            {model.metrics.map((metric) => (
              <article key={metric.label} className="surface-card rounded-[1.5rem] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-[3rem] font-semibold text-foreground">{metric.value}</p>
                {metric.helper ? <p className="mt-3 text-[0.95rem] text-success">{metric.helper}</p> : null}
              </article>
            ))}
          </section>
        ) : null}

        <section className="surface-card mt-6 rounded-[1.6rem] border-border-strong bg-accent/15 px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card/70">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Resumen IA</p>
              <p className="mt-2 text-[1.55rem] leading-10 text-foreground">{model.summary}</p>
            </div>
          </div>
        </section>

        <section className="surface-card mt-6 rounded-[1.6rem] overflow-hidden">
          <div className="flex items-center gap-8 border-b border-border px-5">
            {[
              ["chart", "Gráfico"],
              ["table", "Tabla"],
              ["summary", "Resumen"],
            ].map(([key, label]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as "chart" | "summary" | "table")}
                  className={`border-b-2 px-1 py-4 text-lg transition ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === "chart" ? (
              model.chart ? (
                <MiniBarChart chart={model.chart} />
              ) : (
                <div className="rounded-[1.25rem] bg-muted p-8 text-center text-muted-foreground">
                  No hay gráfico disponible para esta respuesta.
                </div>
              )
            ) : null}

            {activeTab === "table" ? (
              model.table ? (
                <div className="overflow-x-auto rounded-[1.25rem] border border-border">
                  <table className="min-w-full text-left">
                    <thead className="bg-muted">
                      <tr>
                        {model.table.columns.map((column) => (
                          <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {model.table.rows.map((row, rowIndex) => (
                        <tr key={`${rowIndex}-${row[0]}`} className="border-t border-border">
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 text-base text-foreground">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-[1.25rem] bg-muted p-8 text-center text-muted-foreground">
                  No hay tabla disponible para esta respuesta.
                </div>
              )
            ) : null}

            {activeTab === "summary" ? (
              <div className="rounded-[1.25rem] bg-muted p-6">
                <p className="text-[1.35rem] leading-9 text-foreground">{model.summary}</p>
                {model.summaryPoints.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {model.summaryPoints.map((point) => (
                      <li key={point} className="flex gap-3 text-[1.1rem] leading-8 text-foreground">
                        <span className="mt-3 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="surface-card mt-6 rounded-[1.6rem] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTrust((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15">
                <Store className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">Confianza y trazabilidad</p>
                <p className="text-base text-muted-foreground">Verificá cómo se construyó esta respuesta</p>
              </div>
            </div>
            <span className="text-2xl text-muted-foreground">{showTrust ? "−" : "+"}</span>
          </button>

          {showTrust ? (
            <div className="border-t border-border px-5 py-5">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fuente</p>
                    <p className="mt-2 text-xl text-foreground">{model.source}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filtros aplicados</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {model.filters.map((filter) => (
                        <span key={filter} className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-foreground">
                          {filter}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rango de fechas</p>
                    <p className="mt-2 text-xl text-foreground">{model.windowLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Última sincronización</p>
                    <p className="mt-2 text-xl text-foreground">{lastSyncLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cómo se calculó</p>
                <p className="mt-2 text-lg leading-8 text-foreground">
                  Esta respuesta se basa en métricas SQL del backend obtenidas desde datos sincronizados de Tiendanube. La IA explica el resultado, pero los números provienen de consultas determinísticas de la aplicación.
                </p>
              </div>

              {showDebugEvidence && model.table ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vista previa de filas</p>
                  <div className="mt-3 overflow-x-auto rounded-[1.25rem] border border-border">
                    <table className="min-w-full text-left">
                      <thead className="bg-muted">
                        <tr>
                          {model.table.columns.map((column) => (
                            <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {model.table.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`${rowIndex}-${row[0]}`} className="border-t border-border">
                            {row.map((cell, cellIndex) => (
                              <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 text-base text-foreground">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
        </div>
      </div>
    </div>
  );
}
