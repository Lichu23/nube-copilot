"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AnalysisCanvas } from "@/components/chat/analysis-canvas";
import { ButtonLink } from "@/components/ui/button";
import { getPinnedReports, pinnedReportsChangedEvent, removePinnedReport, type PinnedReport } from "@/lib/reports/actions";

export function SavedReportsView({
  initialReports,
  lastSyncLabel,
  storeId,
}: {
  initialReports: PinnedReport[];
  lastSyncLabel: string;
  storeId?: string;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialReports[0]?.id ?? null);
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;

  useEffect(() => {
    async function refreshReports() {
      const nextReports = await getPinnedReports(storeId);
      setReports(nextReports);
      setSelectedReportId((current) => current ?? nextReports[0]?.id ?? null);
    }

    window.addEventListener(pinnedReportsChangedEvent, refreshReports);
    return () => window.removeEventListener(pinnedReportsChangedEvent, refreshReports);
  }, [storeId]);

  async function handleRemove(reportId: string) {
    const nextReports = await removePinnedReport(reportId, storeId).catch(() => reports);
    setReports(nextReports);
    setSelectedReportId((current) => (current === reportId ? (nextReports[0]?.id ?? null) : current));
  }

  if (reports.length === 0) {
    return (
      <section className="surface-card rounded-[1.6rem] p-8 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-primary">
          <Bookmark className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-3xl leading-tight text-foreground">Todavía no hay análisis guardados.</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Fijá un reporte desde el canvas del chat para volver a abrirlo acá sin perder el contexto.
        </p>
        <ButtonLink href={storeId ? `/chat?storeId=${storeId}` : "/chat"} className="mt-6">
          Ir al analista
          <ArrowUpRight className="h-4 w-4" />
        </ButtonLink>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="surface-card h-fit rounded-[1.6rem] p-4">
        <div className="px-2 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Biblioteca</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{reports.length} reportes fijados</h2>
        </div>

        <div className="grid gap-3">
          {reports.map((report) => {
            const isSelected = selectedReport?.id === report.id;

            return (
              <article
                key={report.id}
                className={`rounded-[1rem] border p-4 transition ${
                  isSelected ? "border-ink-navy bg-white shadow-card" : "border-border bg-surface-muted"
                }`}
              >
                <button type="button" onClick={() => setSelectedReportId(report.id)} className="block w-full text-left">
                  <p className="font-semibold text-foreground">{report.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{report.windowLabel}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                </button>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={storeId ? `/chat?prompt=${encodeURIComponent(report.question)}&storeId=${encodeURIComponent(storeId)}` : `/chat?prompt=${encodeURIComponent(report.question)}`}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-border-strong"
                  >
                    Preguntar de nuevo
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(report.id)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground"
                  >
                    <Trash2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Quitar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="min-h-[720px] overflow-hidden rounded-[1.6rem] border border-border bg-card">
        {selectedReport?.model ? (
          <AnalysisCanvas lastSyncLabel={lastSyncLabel} model={selectedReport.model} storeId={storeId} />
        ) : (
          <div className="flex min-h-[720px] items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Reporte anterior</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-foreground">{selectedReport?.title}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Este guardado se creó antes de que el canvas persistiera el modelo completo. Podés reabrir la pregunta en el chat.
              </p>
              {selectedReport ? (
                <ButtonLink href={storeId ? `/chat?prompt=${encodeURIComponent(selectedReport.question)}&storeId=${encodeURIComponent(storeId)}` : `/chat?prompt=${encodeURIComponent(selectedReport.question)}`} className="mt-6">
                  Reabrir en chat
                </ButtonLink>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
