"use client";

import type { ChoiceOption, MultipleChoiceResult } from "@/lib/types";

const PALETTE = [
  "#5b4bff",
  "#ff5b8a",
  "#1bbf83",
  "#ffb020",
  "#3aa0ff",
  "#9b5bff",
  "#ff7a45",
];

/** Animated, RTL-aware horizontal bar chart for Multiple Choice results. */
export function BarChartResult({
  options,
  result,
}: {
  options: ChoiceOption[];
  result: MultipleChoiceResult | null;
}) {
  const tallies = result?.tallies ?? {};
  const total = result?.totalVotes ?? 0;
  const max = Math.max(1, ...options.map((o) => tallies[o.id] ?? 0));

  return (
    <div className="flex w-full flex-col gap-5">
      {options.map((opt, i) => {
        const count = tallies[opt.id] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        const widthPct = (count / max) * 100;
        return (
          <div key={opt.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-ink">{opt.label}</span>
              <span className="text-sm font-bold text-ink-soft tabular-nums">
                {pct}% · {count}
              </span>
            </div>
            <div className="h-12 w-full overflow-hidden rounded-xl bg-surface-2">
              <div
                className="om-bar flex h-full items-center rounded-xl"
                style={{
                  width: `${Math.max(widthPct, count > 0 ? 6 : 0)}%`,
                  background: PALETTE[i % PALETTE.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
