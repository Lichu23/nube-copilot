export function LoadingCanvas() {
  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-muted" />
            <div className="h-16 w-3/4 rounded-2xl bg-muted" />
            <div className="h-8 w-2/3 rounded-xl bg-muted" />
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card rounded-3xl p-5 space-y-3">
                <div className="h-3 w-20 rounded-full bg-muted" />
                <div className="h-10 w-32 rounded-lg bg-muted" />
              </div>
            ))}
          </div>

          <div className="surface-card rounded-[1.6rem] bg-accent/15 p-5">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-full rounded-lg bg-muted" />
                <div className="h-5 w-5/6 rounded-lg bg-muted" />
              </div>
            </div>
          </div>

          <div className="surface-card rounded-[1.6rem] overflow-hidden">
            <div className="flex items-center gap-8 border-b border-border px-5 py-4">
              {["Gráfico", "Tabla", "Resumen"].map((label) => (
                <div key={label} className="h-5 w-16 rounded-lg bg-muted" />
              ))}
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
