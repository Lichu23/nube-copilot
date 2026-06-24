

import type { ToolResult } from "@/lib/types"; 
import { formatScalar } from "@/lib/formatting";

function renderObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return (
      <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-3 text-xs text-white">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(value).map(([key, entry]) => (
            <tr key={key} className="border-t border-black/10 first:border-t-0">
              <th className="w-48 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-700">{key}</th>
              <td className="px-3 py-2 align-top text-zinc-900">{formatScalar(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ToolResultTable({ items }: { items: ToolResult[] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Evidencia estructurada</h2>
      <p className="mt-2 text-sm text-zinc-600">Datos generados por el backend que sostienen la respuesta del analista.</p>

      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay evidencia. Preguntá por ventas, productos top o comparaciones entre períodos.</p>
        ) : (
          items.map((item) => (
            <article key={item.toolCallId} className="rounded-2xl border border-black/10 p-4">
              <div className="mb-3">
                <h3 className="font-medium text-zinc-950">{item.toolName}</h3>
                <p className="text-xs text-zinc-500">Consulta técnica {item.toolCallId}</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Entrada</p>
                  {renderObject(item.input)}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Salida</p>
                  {renderObject(item.output)}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

