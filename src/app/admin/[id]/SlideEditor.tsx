"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { addSlide, deleteSlide, startSession, updateSlide } from "../actions";
import type {
  MultipleChoiceContent,
  OpenEndedContent,
  PinOnImageContent,
  Presentation,
  RankingContent,
  Slide,
  SlideType,
  WordCloudContent,
} from "@/lib/types";

const TYPE_LABELS: Record<SlideType, string> = {
  instructions: "הוראות + QR",
  text: "טקסט",
  multiple_choice: "בחירה מרובה",
  word_cloud: "ענן מילים",
  open_ended: "שאלה פתוחה",
  ranking: "דירוג",
  pin_on_image: "סימון על תמונה",
};

const ALL_TYPES: SlideType[] = [
  "instructions", "text", "multiple_choice", "word_cloud",
  "open_ended", "ranking", "pin_on_image",
];

export function SlideEditor({
  presentation,
  initialSlides,
}: {
  presentation: Presentation;
  initialSlides: Slide[];
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [selectedId, setSelectedId] = useState(initialSlides[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();

  const selected = slides.find((s) => s.id === selectedId) ?? null;

  function patchLocal(slideId: string, patch: Partial<Slide>) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, ...patch } : s))
    );
  }

  function persist(slide: Slide) {
    startTransition(() =>
      updateSlide(slide.id, presentation.id, {
        title: slide.title,
        content_json: slide.content_json,
      })
    );
  }

  return (
    <div className="grid h-screen grid-cols-[260px_1fr_340px] bg-background">
      {/* --- left: slide list + add ----------------------------------- */}
      <aside className="flex flex-col border-e border-border bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
            ← חזרה
          </Link>
          <form action={startSession.bind(null, presentation.id)}>
            <Button type="submit" size="sm">
              הצגה ▶
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={cn(
                "mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-start transition",
                selectedId === s.id
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface hover:bg-surface-2"
              )}
            >
              <span className="text-sm font-bold text-ink-faint">{i + 1}</span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-ink">
                  {s.title || TYPE_LABELS[s.type]}
                </span>
                <span className="text-xs text-ink-faint">
                  {TYPE_LABELS[s.type]}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <p className="mb-2 px-1 text-xs font-semibold text-ink-faint">
            הוספת שקופית
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await addSlide(presentation.id, t);
                    window.location.reload();
                  })
                }
                className="rounded-lg border border-border bg-surface px-2 py-2 text-xs font-semibold text-ink hover:bg-surface-2"
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* --- center: preview ------------------------------------------ */}
      <section className="flex items-center justify-center overflow-hidden p-8">
        {selected ? (
          <div className="aspect-video w-full max-w-3xl rounded-card bg-surface p-10 shadow-[var(--shadow-soft)]">
            <PreviewBody slide={selected} />
          </div>
        ) : (
          <p className="text-ink-faint">בחרו או הוסיפו שקופית</p>
        )}
      </section>

      {/* --- right: edit panel ---------------------------------------- */}
      <aside className="overflow-y-auto border-s border-border bg-surface p-5">
        {selected ? (
          <EditPanel
            key={selected.id}
            slide={selected}
            onChange={(patch) => patchLocal(selected.id, patch)}
            onBlur={() => persist(slides.find((s) => s.id === selected.id)!)}
            onDelete={() =>
              startTransition(async () => {
                await deleteSlide(selected.id, presentation.id);
                window.location.reload();
              })
            }
          />
        ) : (
          <p className="text-ink-faint">אין שקופית נבחרת</p>
        )}
      </aside>
    </div>
  );
}

function PreviewBody({ slide }: { slide: Slide }) {
  if (slide.type === "instructions") {
    const c = slide.content_json as { heading: string; subheading: string };
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-3xl font-black text-ink">{c.heading}</h2>
        <p className="text-ink-soft">{c.subheading}</p>
        <p className="mt-4 text-sm text-ink-faint">[ קוד QR יוצג בזמן ההצגה ]</p>
      </div>
    );
  }
  if (slide.type === "text") {
    const c = slide.content_json as { markdown: string };
    return (
      <div className="h-full overflow-auto whitespace-pre-wrap text-right text-lg text-ink">
        {c.markdown}
      </div>
    );
  }
  if (slide.type === "multiple_choice") {
    const c = slide.content_json as MultipleChoiceContent;
    return (
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-2xl font-bold text-ink">{c.question}</h2>
        <div className="flex flex-col gap-2">
          {c.options.map((o) => (
            <div
              key={o.id}
              className="rounded-xl bg-surface-2 px-4 py-3 font-semibold text-ink"
            >
              {o.label}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (slide.type === "ranking") {
    const c = slide.content_json as RankingContent;
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className="text-xl font-bold text-ink">{c.question}</h2>
        {c.items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2">
            <span className="font-black text-brand">{i + 1}</span>
            <span className="font-semibold text-ink">{it.label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (slide.type === "pin_on_image") {
    const c = slide.content_json as PinOnImageContent;
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className="text-xl font-bold text-ink">{c.question}</h2>
        {c.imageUrl ? (
          <img src={c.imageUrl} alt="" className="max-h-48 w-full rounded-xl object-contain" />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-surface-2 text-ink-faint">הכניסו כתובת URL של תמונה</div>
        )}
      </div>
    );
  }
  const c = slide.content_json as { question: string };
  return (
    <div className="flex h-full items-center justify-center text-center">
      <h2 className="text-2xl font-bold text-ink">{c.question || ""}</h2>
    </div>
  );
}

function EditPanel({
  slide,
  onChange,
  onBlur,
  onDelete,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  const field =
    "h-11 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand";

  function setContent(content: Record<string, unknown>) {
    onChange({ content_json: { ...slide.content_json, ...content } as never });
  }

  return (
    <div className="flex flex-col gap-5" onBlur={onBlur}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink">{TYPE_LABELS[slide.type]}</h3>
        <button onClick={onDelete} className="text-sm text-danger">
          מחיקה
        </button>
      </div>

      {slide.type === "instructions" && (
        <>
          <Labeled label="כותרת">
            <input
              className={field}
              value={(slide.content_json as { heading: string }).heading}
              onChange={(e) => setContent({ heading: e.target.value })}
            />
          </Labeled>
          <Labeled label="כותרת משנה">
            <input
              className={field}
              value={(slide.content_json as { subheading: string }).subheading}
              onChange={(e) => setContent({ subheading: e.target.value })}
            />
          </Labeled>
        </>
      )}

      {slide.type === "text" && (
        <Labeled label="תוכן (Markdown)">
          <textarea
            className="min-h-48 w-full rounded-lg border border-border bg-surface p-3 outline-none focus:border-brand"
            value={(slide.content_json as { markdown: string }).markdown}
            onChange={(e) => setContent({ markdown: e.target.value })}
          />
        </Labeled>
      )}

      {(["multiple_choice", "word_cloud", "ranking"] as SlideType[]).includes(slide.type) && (
        <Labeled label="שאלה">
          <input
            className={field}
            value={(slide.content_json as { question: string }).question}
            onChange={(e) => setContent({ question: e.target.value })}
          />
        </Labeled>
      )}

      {slide.type === "multiple_choice" && (
        <MultipleChoiceFields
          content={slide.content_json as MultipleChoiceContent}
          setContent={setContent}
        />
      )}

      {slide.type === "word_cloud" && (
        <Labeled label="מקסימום תשובות למשתתף">
          <input
            type="number"
            min={1}
            max={10}
            className={field}
            value={(slide.content_json as WordCloudContent).maxEntriesPerUser}
            onChange={(e) =>
              setContent({ maxEntriesPerUser: Number(e.target.value) || 1 })
            }
          />
        </Labeled>
      )}

      {slide.type === "open_ended" && (
        <Labeled label="שאלה">
          <input
            className={field}
            value={(slide.content_json as OpenEndedContent).question}
            onChange={(e) => setContent({ question: e.target.value })}
          />
        </Labeled>
      )}

      {slide.type === "ranking" && (
        <RankingFields
          content={slide.content_json as RankingContent}
          setContent={setContent}
        />
      )}

      {slide.type === "pin_on_image" && (
        <>
          <Labeled label="שאלה">
            <input
              className={field}
              value={(slide.content_json as PinOnImageContent).question}
              onChange={(e) => setContent({ question: e.target.value })}
            />
          </Labeled>
          <Labeled label="כתובת URL של התמונה">
            <input
              className={field}
              dir="ltr"
              placeholder="https://..."
              value={(slide.content_json as PinOnImageContent).imageUrl}
              onChange={(e) => setContent({ imageUrl: e.target.value })}
            />
          </Labeled>
          {(slide.content_json as PinOnImageContent).imageUrl && (
            <img
              src={(slide.content_json as PinOnImageContent).imageUrl}
              alt=""
              className="w-full rounded-lg object-contain"
            />
          )}
        </>
      )}

      <Labeled label="כותרת השקופית (אופציונלי)">
        <input
          className={field}
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Labeled>

      <p className="text-xs text-ink-faint">השינויים נשמרים אוטומטית.</p>
    </div>
  );
}

function MultipleChoiceFields({
  content,
  setContent,
}: {
  content: MultipleChoiceContent;
  setContent: (c: Record<string, unknown>) => void;
}) {
  function setOption(id: string, label: string) {
    setContent({
      options: content.options.map((o) => (o.id === id ? { ...o, label } : o)),
    });
  }
  function addOption() {
    setContent({
      options: [
        ...content.options,
        { id: crypto.randomUUID(), label: `אפשרות ${content.options.length + 1}` },
      ],
    });
  }
  function removeOption(id: string) {
    if (content.options.length <= 2) return;
    setContent({ options: content.options.filter((o) => o.id !== id) });
  }

  return (
    <Labeled label="אפשרויות">
      <div className="flex flex-col gap-2">
        {content.options.map((o) => (
          <div key={o.id} className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand"
              value={o.label}
              onChange={(e) => setOption(o.id, e.target.value)}
            />
            <button
              onClick={() => removeOption(o.id)}
              className="px-2 text-ink-faint hover:text-danger"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addOption}
          className="rounded-lg border border-dashed border-border py-2 text-sm text-ink-soft hover:bg-surface-2"
        >
          + הוספת אפשרות
        </button>
        <label className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={content.allowMultiple}
            onChange={(e) => setContent({ allowMultiple: e.target.checked })}
          />
          לאפשר בחירה מרובה
        </label>
      </div>
    </Labeled>
  );
}

function RankingFields({
  content,
  setContent,
}: {
  content: RankingContent;
  setContent: (c: Record<string, unknown>) => void;
}) {
  function setItem(id: string, label: string) {
    setContent({ items: content.items.map((it) => (it.id === id ? { ...it, label } : it)) });
  }
  function addItem() {
    if (content.items.length >= 6) return;
    setContent({ items: [...content.items, { id: crypto.randomUUID(), label: `פריט ${content.items.length + 1}` }] });
  }
  function removeItem(id: string) {
    if (content.items.length <= 2) return;
    setContent({ items: content.items.filter((it) => it.id !== id) });
  }
  return (
    <Labeled label="פריטים לדירוג">
      <div className="flex flex-col gap-2">
        {content.items.map((it) => (
          <div key={it.id} className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand"
              value={it.label}
              onChange={(e) => setItem(it.id, e.target.value)}
            />
            <button onClick={() => removeItem(it.id)} className="px-2 text-ink-faint hover:text-danger">×</button>
          </div>
        ))}
        {content.items.length < 6 && (
          <button onClick={addItem} className="rounded-lg border border-dashed border-border py-2 text-sm text-ink-soft hover:bg-surface-2">
            + הוספת פריט
          </button>
        )}
      </div>
    </Labeled>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
