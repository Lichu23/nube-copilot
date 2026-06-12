export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-28 rounded-full bg-zinc-200" />
          <div className="h-10 w-80 max-w-full rounded-2xl bg-zinc-200" />
          <div className="h-5 w-[32rem] max-w-full rounded-xl bg-zinc-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="h-3 w-32 rounded-full bg-zinc-200" />
              <div className="mt-4 h-9 w-36 rounded-xl bg-zinc-200" />
              <div className="mt-3 h-4 w-48 rounded-full bg-zinc-200" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="h-80 rounded-2xl border border-black/10 bg-white p-5">
            <div className="h-5 w-40 rounded-full bg-zinc-200" />
            <div className="mt-6 h-56 rounded-xl bg-zinc-100" />
          </div>
          <div className="h-80 rounded-2xl border border-black/10 bg-white p-5">
            <div className="h-5 w-36 rounded-full bg-zinc-200" />
            <div className="mt-6 space-y-3">
              <div className="h-4 rounded-full bg-zinc-100" />
              <div className="h-4 w-5/6 rounded-full bg-zinc-100" />
              <div className="h-4 w-2/3 rounded-full bg-zinc-100" />
            </div>
          </div>
        </div>

        <div className="h-72 rounded-2xl border border-black/10 bg-white p-5">
          <div className="h-5 w-52 rounded-full bg-zinc-200" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
