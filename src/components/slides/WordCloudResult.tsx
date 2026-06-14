"use client";

import { useMemo } from "react";
import type { WordCloudResult as WCResult } from "@/lib/types";

const PALETTE = ["#5b4bff", "#ff5b8a", "#1bbf83", "#ffb020", "#3aa0ff", "#9b5bff"];
const MIN_REM = 1.1;
const MAX_REM = 4.5;

/** Frequency-scaled word cloud. Identical words grow; colors rotate. */
export function WordCloudResult({ result }: { result: WCResult | null }) {
  const words = useMemo(() => {
    const freq = result?.frequencies ?? {};
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map((e) => e[1]));
    return entries.map(([word, count], i) => {
      const scale = count / max;
      const size = MIN_REM + scale * (MAX_REM - MIN_REM);
      return { word, count, size, color: PALETTE[i % PALETTE.length] };
    });
  }, [result]);

  if (words.length === 0) {
    return (
      <p className="text-2xl text-ink-faint">בהמתנה לתשובות הראשונות...</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {words.map(({ word, count, size, color }) => (
        <span
          key={word}
          title={`${word} · ${count}`}
          className="om-fade-in font-bold leading-tight transition-all"
          style={{ fontSize: `${size}rem`, color }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
