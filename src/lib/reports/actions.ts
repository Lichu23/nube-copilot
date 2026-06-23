import type { CanvasModel } from "@/lib/types";

export const pinnedReportsChangedEvent = "nube-copilot:pinned-reports-changed";

export type PinnedReport = {
  createdAt: string;
  id: string;
  model?: CanvasModel;
  question: string;
  summary: string;
  title: string;
  windowLabel: string;
};

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function buildReportId(model: CanvasModel) {
  return [model.title, model.userQuestion, model.windowLabel, model.summary].join("|");
}

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildReportShareText(model: CanvasModel) {
  const metrics = model.metrics.map((metric) => `- ${metric.label}: ${metric.value}`).join("\n");
  const actions = model.summaryPoints.length > 0 ? `\n\nAcciones sugeridas:\n${model.summaryPoints.map((point) => `- ${point}`).join("\n")}` : "";

  return `${model.title}\n${model.windowLabel}\n\nPregunta: ${model.userQuestion}\n\n${model.summary}\n\nMétricas:\n${metrics}${actions}`;
}

export async function copyReportSummary(model: CanvasModel) {
  await navigator.clipboard.writeText(buildReportShareText(model));
}

export function exportReportCsv(model: CanvasModel) {
  const rows =
    model.table?.rows && model.table.rows.length > 0
      ? [model.table.columns, ...model.table.rows]
      : [["Métrica", "Valor"], ...model.metrics.map((metric) => [metric.label, metric.value])];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");

  downloadFile(`${safeFilename(model.title) || "reporte"}.csv`, "text/csv;charset=utf-8", csv);
}

export function exportReportImage(model: CanvasModel) {
  const metrics = model.metrics
    .slice(0, 4)
    .map(
      (metric, index) =>
        `<text x="48" y="${310 + index * 34}" font-family="Arial" font-size="22" fill="#111827">${escapeXml(metric.label)}: ${escapeXml(metric.value)}</text>`,
    )
    .join("");
  const summary = escapeXml(model.summary);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" rx="40" fill="#f8fafc"/>
  <rect x="32" y="32" width="1136" height="566" rx="32" fill="#ffffff" stroke="#d4d4d8"/>
  <text x="48" y="96" font-family="Arial" font-size="28" fill="#0f766e">Tiendanube - Reporte</text>
  <text x="48" y="160" font-family="Arial" font-size="58" font-weight="700" fill="#09090b">${escapeXml(model.title)}</text>
  <foreignObject x="48" y="200" width="1080" height="92">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 24px; line-height: 1.35; color: #3f3f46;">${summary}</div>
  </foreignObject>
  ${metrics}
  <text x="48" y="560" font-family="Arial" font-size="20" fill="#71717a">${escapeXml(model.windowLabel)}</text>
</svg>`;

  downloadFile(`${safeFilename(model.title) || "reporte"}.svg`, "image/svg+xml;charset=utf-8", svg);
}

export async function getPinnedReports(storeId?: string) {
  const response = await fetch(storeId ? `/api/reports/saved?storeId=${encodeURIComponent(storeId)}` : "/api/reports/saved", {
    cache: "no-store",
  });

  if (!response.ok) {
    return [] satisfies PinnedReport[];
  }

  const payload = (await response.json()) as {
    ok: boolean;
    reports?: PinnedReport[];
  };

  return payload.ok ? (payload.reports ?? []) : [];
}

export async function pinReport(model: CanvasModel, storeId?: string) {
  const reportId = buildReportId(model);
  const current = await getPinnedReports(storeId);
  const existing = current.find((report) => report.id === reportId);

  if (existing) {
    return { report: existing, status: "already-pinned" as const };
  }

  const pinnedReport: PinnedReport = {
    createdAt: new Date().toISOString(),
    id: reportId,
    model,
    question: model.userQuestion,
    summary: model.summary,
    title: model.title,
    windowLabel: model.windowLabel,
  };

  const response = await fetch(storeId ? `/api/reports/saved?storeId=${encodeURIComponent(storeId)}` : "/api/reports/saved", {
    body: JSON.stringify(pinnedReport),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "No se pudo fijar el reporte.");
  }

  window.dispatchEvent(new Event(pinnedReportsChangedEvent));
  return { report: pinnedReport, status: "pinned" as const };
}

export async function removePinnedReport(id: string, storeId?: string) {
  const response = await fetch(
    storeId ? `/api/reports/saved?id=${encodeURIComponent(id)}&storeId=${encodeURIComponent(storeId)}` : `/api/reports/saved?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "No se pudo eliminar el reporte.");
  }

  window.dispatchEvent(new Event(pinnedReportsChangedEvent));
  return getPinnedReports(storeId);
}
