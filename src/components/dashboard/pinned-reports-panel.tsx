"use client";

import { useState } from "react";

import { pinnedReportsChangedEvent, removePinnedReport, type PinnedReport } from "@/lib/reports/actions";

export function PinnedReportsPanel({
  initialReports,
  storeId,
}: {
  initialReports: PinnedReport[];
  storeId?: string;
}) {
  const [reports, setReports] = useState(initialReports);

  async function handleRemove(reportId: string) {
    const nextReports = await removePinnedReport(reportId, storeId).catch(() => reports);
    setReports(nextReports);
    window.dispatchEvent(new Event(pinnedReportsChangedEvent));
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Reportes fijados</p>
        <h2 className="text-lg font-semibold">Guardados en la tienda</h2>
        <p className="text-sm text-zinc-600">Usalos para volver a revisar reportes importantes sin perder el contexto.</p>
      </div>

      <div className="mt-4 grid gap-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-xl border border-black/5 bg-zinc-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">{report.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{report.windowLabel}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700">{report.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleRemove(report.id)}
                className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:text-zinc-950"
              >
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
