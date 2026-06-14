"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePresenterSession } from "@/hooks/usePresenterSession";
import { PresenterSlide } from "@/components/slides/PresenterSlide";
import { exportElementToPdf } from "@/lib/pdf";
import { formatRoomCode } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { LiveSession, Presentation, Slide } from "@/lib/types";

export function Presenter({
  presentation,
  slides,
  session,
}: {
  presentation: Presentation;
  slides: Slide[];
  session: LiveSession;
}) {
  const router = useRouter();
  const { activeSlide, activeIndex, payload, participantHint, next, prev } =
    usePresenterSession(session, slides);
  const [exporting, setExporting] = useState(false);

  // Keyboard navigation (arrow keys flip in RTL: Left = next).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  async function handleExport() {
    const el = document.getElementById("om-capture");
    if (!el) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        el,
        `${presentation.title}-שקופית-${activeIndex + 1}`
      );
    } finally {
      setExporting(false);
    }
  }

  if (!activeSlide) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink-faint">
        אין שקופיות במצגת
      </main>
    );
  }

  const isVisual =
    activeSlide.type === "multiple_choice" || activeSlide.type === "word_cloud";

  return (
    <main className="flex h-screen flex-col bg-background">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-ink">{presentation.title}</span>
          <span className="rounded-pill bg-brand-soft px-3 py-1 text-sm font-semibold text-brand tabular-nums">
            קוד: {formatRoomCode(session.room_code)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">
            👥 {participantHint} השתתפו בשקופית
          </span>
          {isVisual && (
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? "מייצא..." : "ייצוא PDF"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => router.push("/admin")}>
            סיום
          </Button>
        </div>
      </header>

      {/* slide stage */}
      <div className="relative flex-1 overflow-hidden">
        <PresenterSlide
          slide={activeSlide}
          payload={payload}
          presentationId={presentation.id}
          roomCode={session.room_code}
        />
      </div>

      {/* controls */}
      <footer className="flex items-center justify-center gap-6 border-t border-border bg-surface px-6 py-3">
        <Button variant="outline" size="sm" onClick={prev} disabled={activeIndex === 0}>
          → הקודם
        </Button>
        <span className="text-sm font-semibold text-ink-soft tabular-nums">
          {activeIndex + 1} / {slides.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={next}
          disabled={activeIndex === slides.length - 1}
        >
          הבא ←
        </Button>
      </footer>
    </main>
  );
}
