import { Sparkles } from "lucide-react";

export function EmptyCanvas() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-12 text-center">
      <div className="surface-card mb-7 inline-flex h-18 w-18 items-center justify-center rounded-[1.75rem] border-border-strong bg-card">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-display text-[4.25rem] leading-[0.92] text-foreground">Tu panel de análisis</h2>
      <p className="mt-6 max-w-2xl text-[1.45rem] leading-10 text-muted-foreground">
        Hacé una pregunta a la izquierda y el reporte completo — KPIs, gráfico, tabla y capa de confianza — aparece acá,
        al lado de la conversación.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {[
          ["Chat", "para preguntar"],
          ["Canvas", "para inspeccionar"],
          ["Confianza", "para verificar"],
        ].map(([title, subtitle]) => (
          <div key={title} className="surface-card rounded-[1.4rem] px-9 py-4 text-center">
            <p className="text-[1.15rem] font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

