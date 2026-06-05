type InsightCardProps = {
  title: string;
  body: string;
};

export function InsightCard({ title, body }: InsightCardProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}
