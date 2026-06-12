import { ChartColumn, Copy, Download, Pin } from "lucide-react";
import type { CanvasModel } from "@/lib/types";

export function ReportPreviewCard({
  model,
  onOpenAnalysis,
  onCopiarSummary,
  onSuggestedQuestionClick,
}: {
  model: CanvasModel;
  onCopiarSummary: () => void;
  onOpenAnalysis: () => void;
  onSuggestedQuestionClick: (question: string) => void;
}) {
  const suggestedQuestions = model.suggestedQuestions ?? [];

  return (
    <article className="surface-card-strong overflow-hidden rounded-[1.75rem]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Reporte | Tiendanube
            </div>
            <h3 className="font-display mt-3 text-[2.05rem] leading-[0.95] text-foreground">{model.title}</h3>
          </div>
          <button
            type="button"
            onClick={onOpenAnalysis}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
            aria-label="Abrir análisis"
          >
            <ChartColumn className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-5 overflow-hidden">
          <p className="max-h-[6.5rem] pr-2 text-[1.08rem] leading-8 text-foreground/88">{model.summary}</p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/92 to-transparent" />
        </div>
      </div>

      <div className="border-t border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <button type="button" className="inline-flex items-center gap-2 transition hover:text-foreground">
              <Pin className="h-4 w-4" />
              Fijar
            </button>
            <button type="button" className="inline-flex items-center gap-2 transition hover:text-foreground">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={onCopiarSummary}
              className="inline-flex items-center gap-2 transition hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAnalysis}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Abrir análisis
          </button>
        </div>

        {suggestedQuestions.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Preguntas para seguir
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedQuestions.slice(0, 3).map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => onSuggestedQuestionClick(question)}
                  className="cursor-pointer rounded-full border border-border bg-muted px-3 py-1.5 text-left text-sm leading-5 text-foreground transition hover:border-accent hover:bg-accent/10"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
