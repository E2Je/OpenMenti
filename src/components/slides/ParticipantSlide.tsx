"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  MultipleChoiceContent,
  Slide,
  VoteInput,
  WordCloudContent,
} from "@/lib/types";

type Submit = (message: VoteInput) => Promise<void>;

export function ParticipantSlide({
  slide,
  submit,
}: {
  slide: Slide;
  submit: Submit;
}) {
  switch (slide.type) {
    case "multiple_choice":
      return <MultipleChoiceInput slide={slide} submit={submit} />;
    case "word_cloud":
      return <WordCloudInput slide={slide} submit={submit} />;
    case "instructions":
    case "text":
    default:
      return <PassiveView title={slide.title} />;
  }
}

function PassiveView({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="text-5xl">👀</div>
      <p className="text-xl font-semibold text-ink">{title || "עקבו אחר המסך"}</p>
      <p className="text-ink-soft">המסך הראשי מציג את התוכן הנוכחי</p>
    </div>
  );
}

function MultipleChoiceInput({ slide, submit }: { slide: Slide; submit: Submit }) {
  const content = slide.content_json as MultipleChoiceContent;
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  function toggle(id: string) {
    if (sent) return;
    setSelected((prev) =>
      content.allowMultiple
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id]
    );
  }

  async function send() {
    if (selected.length === 0) return;
    await submit({ type: "mc_vote", slideId: slide.id, optionIds: selected });
    setSent(true);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{content.question}</h1>
      <div className="flex flex-col gap-3">
        {content.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={cn(
              "flex h-16 items-center rounded-2xl border-2 px-5 text-start text-lg font-semibold transition-all active:scale-[0.98]",
              selected.includes(opt.id)
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface text-ink"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-auto w-full"
        disabled={selected.length === 0 || sent}
        onClick={send}
      >
        {sent ? "נשלח ✓ אפשר לעדכן" : "שליחה"}
      </Button>
      {sent && (
        <button
          className="text-sm text-ink-soft underline"
          onClick={() => setSent(false)}
        >
          שינוי הבחירה
        </button>
      )}
    </div>
  );
}

function WordCloudInput({ slide, submit }: { slide: Slide; submit: Submit }) {
  const content = slide.content_json as WordCloudContent;
  const max = Math.max(1, content.maxEntriesPerUser || 1);
  const [value, setValue] = useState("");
  const [count, setCount] = useState(0);
  const remaining = max - count;

  async function send() {
    const word = value.trim();
    if (!word || remaining <= 0) return;
    await submit({ type: "word_submit", slideId: slide.id, words: [word] });
    setCount((c) => c + 1);
    setValue("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{content.question}</h1>
      <p className="text-ink-soft">
        {remaining > 0
          ? `נותרו ${remaining} מתוך ${max} תשובות`
          : "הגעתם למקסימום התשובות"}
      </p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        maxLength={40}
        disabled={remaining <= 0}
        placeholder="הקלידו מילה..."
        className="h-16 w-full rounded-2xl border-2 border-border bg-surface px-5 text-lg outline-none focus:border-brand"
      />
      <Button
        size="lg"
        className="mt-auto w-full"
        disabled={!value.trim() || remaining <= 0}
        onClick={send}
      >
        שליחה
      </Button>
    </div>
  );
}
