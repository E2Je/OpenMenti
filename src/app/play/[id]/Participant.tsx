"use client";

import { useParticipantSession } from "@/hooks/useParticipantSession";
import { ParticipantSlide } from "@/components/slides/ParticipantSlide";

export function Participant({ presentationId }: { presentationId: string }) {
  const { connState, activeSlide, submit } =
    useParticipantSession(presentationId);

  return (
    <main className="flex min-h-screen flex-col px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-brand">itameter</span>
        <StatusDot state={connState} />
      </div>

      {connState === "connecting" && <Centered text="מתחבר..." />}
      {connState === "no_session" && (
        <Centered text="אין כרגע הצגה פעילה. בדקו את הקוד." emoji="🔌" />
      )}
      {connState === "ended" && <Centered text="ההצגה הסתיימה. תודה!" emoji="👋" />}
      {connState === "waiting" && (
        <Centered text="ממתינים שהמנחה יתחיל..." emoji="⏳" />
      )}
      {connState === "live" && activeSlide && (
        <ParticipantSlide slide={activeSlide} submit={submit} />
      )}
    </main>
  );
}

function Centered({ text, emoji }: { text: string; emoji?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      {emoji && <div className="text-5xl">{emoji}</div>}
      <p className="text-lg font-semibold text-ink-soft">{text}</p>
    </div>
  );
}

function StatusDot({ state }: { state: string }) {
  const live = state === "live" || state === "waiting";
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-faint">
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-ink-faint"}`}
      />
      {live ? "מחובר" : "לא מחובר"}
    </span>
  );
}
