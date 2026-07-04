"use client";

import { useCallback, useMemo, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { compareWindowConfig, type CompareWindowKey } from "@/lib/dashboard/config";
import { buildDashboardHref } from "@/lib/dashboard/href";

type DashboardRangeSelectorProps = {
  asOfInputValue: string;
  compareWindow: CompareWindowKey;
  showAsOfControl?: boolean;
  storeId: string;
};

export function DashboardRangeSelector({
  asOfInputValue,
  compareWindow,
  showAsOfControl = true,
  storeId,
}: DashboardRangeSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const buttons = useMemo(
    () => Object.entries(compareWindowConfig) as Array<[CompareWindowKey, (typeof compareWindowConfig)[CompareWindowKey]]>,
    [],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const nextAsOf = formData.get("asOf");

      startTransition(() => {
        router.replace(
          buildDashboardHref(
            compareWindow,
            typeof nextAsOf === "string" && nextAsOf ? nextAsOf : null,
            storeId,
          ),
        );
      });
    },
    [compareWindow, router, storeId],
  );

  const navigate = useCallback(
    (nextWindow: CompareWindowKey) => {
      startTransition(() => {
        router.replace(buildDashboardHref(nextWindow, showAsOfControl ? asOfInputValue : null, storeId));
      });
    },
    [asOfInputValue, router, showAsOfControl, storeId],
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" aria-busy={isPending}>
      {showAsOfControl ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Fecha de corte
            <input
              name="asOf"
              type="date"
              defaultValue={asOfInputValue}
              disabled={isPending}
              className="h-10 rounded-full border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-wait disabled:bg-zinc-50"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full btn-ink px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Cargando..." : "Aplicar"}
          </button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {buttons.map(([key, config]) => {
          const isActive = compareWindow === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key)}
              disabled={isPending}
              aria-pressed={isActive}
              className={`inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition disabled:cursor-wait disabled:opacity-70 ${
                isActive
                  ? "bg-ink-navy !text-white shadow-sm"
                  : "border border-border bg-white text-muted-foreground hover:text-foreground"
              }`}
            >
              {isPending && isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {config.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
