import { LoadingCanvas } from "@/components/chat/loading-canvas";

export default function ChatLoading() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(360px,0.55fr)_minmax(0,1fr)]">
      <section className="flex min-h-screen flex-col border-r border-border bg-card px-5 py-6">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
          <div className="animate-pulse space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="h-10 w-72 max-w-full rounded-2xl bg-muted" />
              <div className="h-5 w-96 max-w-full rounded-xl bg-muted" />
            </div>

            <div className="space-y-3">
              <div className="h-14 w-4/5 rounded-[1.5rem] bg-muted" />
              <div className="ml-auto h-14 w-2/3 rounded-[1.5rem] bg-muted" />
              <div className="h-24 w-full rounded-[1.5rem] bg-muted" />
            </div>
          </div>

          <div className="mt-auto rounded-[1.5rem] border border-border bg-background p-4">
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </section>

      <aside className="hidden min-h-screen lg:block">
        <LoadingCanvas />
      </aside>
    </div>
  );
}
