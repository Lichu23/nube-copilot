import type { CanvasModel } from "@/lib/types";

export const pinnedReportsKey = "nube-copilot:pinned-reports";
export const pinnedReportsChangedEvent = "nube-copilot:pinned-reports-changed";

export type PinnedReport = {
  createdAt: string;
  id: string;
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

  return `${model.title}\n${model.windowLabel}\n\nPregunta: ${model.userQuestion}\n\n${model.summary}\n\nMetricas:\n${metrics}${actions}`;
}

export async function copyReportSummary(model: CanvasModel) {
  await navigator.clipboard.writeText(buildReportShareText(model));
}

export function exportReportCsv(model: CanvasModel) {
  const rows =
    model.table?.rows && model.table.rows.length > 0
      ? [model.table.columns, ...model.table.rows]
      : [["Metrica", "Valor"], ...model.metrics.map((metric) => [metric.label, metric.value])];
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

export function pinReport(model: CanvasModel) {
  const current = getPinnedReports();
  const reportId = buildReportId(model);
  const existing = current.find((report) => report.id === reportId);

  if (existing) {
    return { report: existing, status: "already-pinned" as const };
  }

  const pinnedReport: PinnedReport = {
    createdAt: new Date().toISOString(),
    id: reportId,
    question: model.userQuestion,
    summary: model.summary,
    title: model.title,
    windowLabel: model.windowLabel,
  };

  localStorage.setItem(pinnedReportsKey, JSON.stringify([pinnedReport, ...current].slice(0, 20)));
  window.dispatchEvent(new Event(pinnedReportsChangedEvent));
  return { report: pinnedReport, status: "pinned" as const };
}

export function getPinnedReports() {
  const reports = JSON.parse(localStorage.getItem(pinnedReportsKey) ?? "[]") as PinnedReport[];
  const uniqueReports = new Map<string, PinnedReport>();

  for (const report of reports) {
    const stableId = [report.title, report.question, report.windowLabel, report.summary].join("|");
    uniqueReports.set(stableId, { ...report, id: stableId });
  }

  return Array.from(uniqueReports.values());
}

export function removePinnedReport(id: string) {
  const next = getPinnedReports().filter((report) => report.id !== id);
  localStorage.setItem(pinnedReportsKey, JSON.stringify(next));
  window.dispatchEvent(new Event(pinnedReportsChangedEvent));
  return next;
}
