"use client";

import { Copy, Download, Image as ImageIcon, Pin, Sparkles, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { copyReportSummary, exportReportCsv, exportReportImage, pinReport } from "@/lib/reports/actions";
import type { CanvasModel } from "@/lib/types";
import { EmptyCanvas } from "./empty-canvas";
import { LoadingCanvas } from "./loading-canvas";
import { MiniBarChart } from "./mini-bar-chart";

const showDebugEvidence =
  process.env.NEXT_PUBLIC_SHOW_CHAT_DEBUG_EVIDENCE === "true";

export function AnalysisCanvas({
  lastSyncLabel,
  model,
  isPending = false,
}: {
  lastSyncLabel: string;
  model: CanvasModel | null;
  isPending?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const [actionState, setActionState] = useState<"already-pinned" | "copied" | "error" | "exported" | "image" | "idle" | "pinned">("idle");
  const [showTrust, setShowTrust] = useState(false);
  const [isVisible, setIsVisible] = useState(!!model);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevModelRef = useRef<CanvasModel | null>(model);

  useEffect(() => {
    if (containerRef.current && model) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [model]);

  useEffect(() => {
    if (model && prevModelRef.current?.title !== model.title) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      prevModelRef.current = model;
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

  async function handleCopy() {
    if (!model) return;
    await copyReportSummary(model);
    setActionState("copied");
    window.setTimeout(() => setActionState("idle"), 1500);
  }

  function handleExportCsv() {
    if (!model) return;
    exportReportCsv(model);
    setActionState("exported");
    window.setTimeout(() => setActionState("idle"), 1500);
  }

  function handleExportImage() {
    if (!model) return;
    exportReportImage(model);
    setActionState("image");
    window.setTimeout(() => setActionState("idle"), 1500);
  }

  async function handlePinReport() {
    if (!model) return;

    try {
      const result = await pinReport(model);
      setActionState(result.status);
    } catch {
      setActionState("error");
    }

    window.setTimeout(() => setActionState("idle"), 1500);
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-7 py-7">
      <div className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="teal-soft inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium">
                <Store className="h-3.5 w-3.5" />
                Tiendanube
              </span>
              <span>{model.windowLabel}</span>
              <span>{lastSyncLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <button type="button" onClick={handlePinReport} className="rounded-full border border-border bg-card px-3 py-1.5 transition hover:border-border-strong">
                <Pin className="mr-1.5 inline h-4 w-4" />
                Fijar
              </button>
              <button type="button" onClick={handleExportCsv} className="rounded-full border border-border bg-card px-3 py-1.5 transition hover:border-border-strong">
                <Download className="mr-1.5 inline h-4 w-4" />
                CSV
              </button>
              <button type="button" onClick={handleExportImage} className="rounded-full border border-border bg-card px-3 py-1.5 transition hover:border-border-strong">
                <ImageIcon className="mr-1.5 inline h-4 w-4" />
                Imagen
              </button>
              <button type="button" onClick={handleCopy} className="rounded-full border border-border bg-card px-3 py-1.5 transition hover:border-border-strong">
                <Copy className="mr-1.5 inline h-4 w-4" />
                Copiar
              </button>
            </div>
          </div>
          {actionState !== "idle" ? (
            <p className="mt-3 text-right text-sm text-success">
              {actionState === "copied"
                ? "Resumen copiado."
                : actionState === "exported"
                  ? "CSV exportado."
                  : actionState === "image"
                    ? "Imagen exportada."
                    : actionState === "error"
                      ? "No se pudo guardar el reporte."
                      : actionState === "already-pinned"
                        ? "Este reporte ya estaba fijado."
                        : "Reporte fijado."}
            </p>
          ) : null}

          <header className="mt-5">
            <h1 className="font-display max-w-4xl text-[3.6rem] leading-[0.9] text-foreground">{model.title}</h1>
            <p className="mt-4 max-w-3xl text-[1.35rem] italic leading-8 text-muted-foreground">&quot;{model.userQuestion}&quot;</p>
          </header>

          {model.metrics.length > 0 ? (
            <section className="mt-8 grid items-start gap-4 xl:grid-cols-4">
              {model.metrics.map((metric) => (
                <article key={metric.label} className="surface-card self-start rounded-[1.5rem] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 break-words text-[2.2rem] font-semibold leading-tight text-foreground">{metric.value}</p>
                  {metric.helper ? <p className="mt-3 text-[0.95rem] text-success">{metric.helper}</p> : null}
                  {metric.definition ? (
                    <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">
                      {metric.definition.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          <section className="mt-6 rounded-[1.6rem] bg-ink-navy px-5 py-5 text-white shadow-xl shadow-ink-navy/10">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Resumen IA</p>
                <p className="mt-2 text-[1.45rem] leading-9 text-white">{model.summary}</p>
                {model.summaryPoints.length > 0 ? (
                  <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                      Acciones sugeridas
                    </p>
                    <ul className="mt-3 space-y-2">
                      {model.summaryPoints.map((point) => (
                        <li key={point} className="flex gap-3 text-[1.02rem] leading-7 text-white/90">
                          <span className="mt-3 h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {model.visualizationMode === "compact" ? (
            <section className="surface-card mt-6 rounded-[1.6rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Vista compacta
              </p>
              <p className="mt-2 text-base leading-7 text-foreground/80">
                Esta respuesta se entiende mejor en texto. No hacía falta agregar tabla ni gráfico.
              </p>
            </section>
          ) : (
            <section className="surface-card mt-6 overflow-hidden rounded-[1.6rem]">
              <div className="flex items-center gap-8 border-b border-border px-5">
                {[
                  ["chart", "Gráfico"],
                  ["table", "Tabla"],
                ].map(([key, label]) => {
                  const isActive = activeTab === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key as "chart" | "table")}
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
                    <div className="max-h-[26rem] overflow-auto rounded-[1.25rem] border border-border">
                      <table className="min-w-full text-left">
                        <thead className="sticky top-0 z-10 bg-muted">
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
              </div>
            </section>
          )}

          <section className="surface-card mt-6 overflow-hidden rounded-[1.6rem]">
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

                {model.definitions && model.definitions.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Definiciones de métricas</p>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      {model.definitions.map((definition) => (
                        <article key={`${definition.label}-${definition.source}`} className="rounded-[1.25rem] border border-border bg-muted p-4">
                          <p className="text-base font-semibold text-foreground">{definition.label}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{definition.description}</p>
                          <p className="mt-2 text-sm text-foreground">
                            <span className="font-medium">Cálculo:</span> {definition.calculation}.
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">Fuente: {definition.source}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showDebugEvidence && model.table ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vista previa de filas</p>
                    <div className="mt-3 max-h-[18rem] overflow-auto rounded-[1.25rem] border border-border">
                      <table className="min-w-full text-left">
                        <thead className="sticky top-0 z-10 bg-muted">
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
