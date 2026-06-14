"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  MultipleChoiceContent,
  OpenEndedContent,
  PinOnImageContent,
  RankingContent,
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
    case "open_ended":
      return <OpenEndedInput slide={slide} submit={submit} />;
    case "ranking":
      return <RankingInput slide={slide} submit={submit} />;
    case "pin_on_image":
      return <PinOnImageInput slide={slide} submit={submit} />;
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
        ? prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      <Button size="lg" className="mt-auto w-full" disabled={selected.length === 0 || sent} onClick={send}>
        {sent ? "נשלח ✓" : "שליחה"}
      </Button>
      {sent && (
        <button className="text-sm text-ink-soft underline" onClick={() => setSent(false)}>
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
        {remaining > 0 ? `נותרו ${remaining} מתוך ${max} תשובות` : "הגעתם למקסימום התשובות"}
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
      <Button size="lg" className="mt-auto w-full" disabled={!value.trim() || remaining <= 0} onClick={send}>
        שליחה
      </Button>
    </div>
  );
}

function OpenEndedInput({ slide, submit }: { slide: Slide; submit: Submit }) {
  const content = slide.content_json as OpenEndedContent;
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    const text = value.trim();
    if (!text) return;
    await submit({ type: "open_submit", slideId: slide.id, text });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold text-ink">תשובתכם נשלחה!</p>
        <button className="text-sm text-ink-soft underline" onClick={() => { setSent(false); setValue(""); }}>
          שליחת תשובה נוספת
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{content.question}</h1>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={280}
        rows={5}
        placeholder="כתבו את תשובתכם כאן..."
        className="w-full flex-1 resize-none rounded-2xl border-2 border-border bg-surface p-4 text-lg outline-none focus:border-brand"
      />
      <p className="text-xs text-ink-faint">{value.length}/280</p>
      <Button size="lg" className="mt-auto w-full" disabled={!value.trim()} onClick={send}>
        שליחה
      </Button>
    </div>
  );
}

function RankingInput({ slide, submit }: { slide: Slide; submit: Submit }) {
  const content = slide.content_json as RankingContent;
  const [items, setItems] = useState(content.items ?? []);
  const [sent, setSent] = useState(false);

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
  }

  async function send() {
    await submit({ type: "ranking_submit", slideId: slide.id, order: items.map((i) => i.id) });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold text-ink">הדירוג נשלח!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{content.question}</h1>
      <p className="text-sm text-ink-soft">גררו או השתמשו בחצים לשינוי הסדר</p>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border-2 border-border bg-surface px-4 py-3"
          >
            <span className="w-6 text-center text-sm font-black text-brand">{idx + 1}</span>
            <span className="flex-1 font-semibold text-ink">{item.label}</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="rounded px-2 py-0.5 text-lg text-ink-soft disabled:opacity-20 active:bg-surface-2"
              >
                ↑
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                className="rounded px-2 py-0.5 text-lg text-ink-soft disabled:opacity-20 active:bg-surface-2"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button size="lg" className="mt-auto w-full" onClick={send}>
        שליחת הדירוג
      </Button>
    </div>
  );
}

function PinOnImageInput({ slide, submit }: { slide: Slide; submit: Submit }) {
  const content = slide.content_json as PinOnImageContent;
  const containerRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [sent, setSent] = useState(false);

  function handleTap(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    if (sent || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPin({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  async function send() {
    if (!pin) return;
    await submit({ type: "pin_drop", slideId: slide.id, xPct: pin.x, yPct: pin.y });
    setSent(true);
  }

  if (!content.imageUrl) {
    return <PassiveView title="ממתין לתמונה מהמנחה..." />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{content.question}</h1>
      <p className="text-sm text-ink-soft">{sent ? "הסימון נשלח!" : "הקישו על התמונה לסימון"}</p>
      <div
        ref={containerRef}
        onClick={handleTap}
        onTouchStart={handleTap}
        className={cn("relative w-full overflow-hidden rounded-2xl border-2", sent ? "border-success" : "border-border", "cursor-crosshair")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.imageUrl} alt="" className="w-full" draggable={false} />
        {pin && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <div className="h-6 w-6 rounded-full border-2 border-white bg-brand shadow-lg" />
          </div>
        )}
      </div>
      <Button size="lg" className="mt-auto w-full" disabled={!pin || sent} onClick={send}>
        {sent ? "נשלח ✓" : "אישור סימון"}
      </Button>
    </div>
  );
}
