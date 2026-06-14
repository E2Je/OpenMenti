"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui";
import { cn, joinUrl, formatRoomCode } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  addSlide,
  deleteSlide,
  reorderSlides,
  startSession,
  updateSlide,
} from "../actions";
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
  "instructions",
  "text",
  "multiple_choice",
  "word_cloud",
  "open_ended",
  "ranking",
  "pin_on_image",
];

type MobileTab = "slides" | "preview" | "edit";

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
  const [mobileTab, setMobileTab] = useState<MobileTab>("slides");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

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

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...slides];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setSlides(next);
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
    startTransition(() =>
      reorderSlides(
        presentation.id,
        slides.map((s) => s.id)
      )
    );
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const swap = idx + dir;
    if (swap < 0 || swap >= slides.length) return;
    const next = [...slides];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSlides(next);
    startTransition(() =>
      reorderSlides(
        presentation.id,
        next.map((s) => s.id)
      )
    );
  }

  function handleDelete(slideId: string) {
    startTransition(async () => {
      await deleteSlide(slideId, presentation.id);
      if (selectedId === slideId) {
        const remaining = slides.filter((s) => s.id !== slideId);
        setSelectedId(remaining[0]?.id ?? null);
      }
      setSlides((prev) => prev.filter((s) => s.id !== slideId));
    });
  }

  const slideListPanel = (
    <aside
      className={cn(
        "flex flex-col border-e border-border bg-surface",
        mobileTab === "slides" ? "flex" : "hidden md:flex"
      )}
    >
      <div className="flex-1 overflow-y-auto p-3">
        {slides.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={cn(
              "mb-2 flex w-full items-center gap-2 rounded-xl border p-2.5 transition",
              selectedId === s.id
                ? "border-brand bg-brand-soft"
                : "border-border bg-surface hover:bg-surface-2",
              dragIdx === i && "opacity-40"
            )}
          >
            {/* drag handle */}
            <span className="cursor-grab select-none text-lg text-ink-faint active:cursor-grabbing">
              ⠿
            </span>

            {/* title — click to select */}
            <button
              onClick={() => {
                setSelectedId(s.id);
                setMobileTab("edit");
              }}
              className="flex min-w-0 flex-1 flex-col text-start"
            >
              <span className="truncate text-sm font-semibold text-ink">
                {s.title || TYPE_LABELS[s.type]}
              </span>
              <span className="text-xs text-ink-faint">{TYPE_LABELS[s.type]}</span>
            </button>

            {/* up / down */}
            <div className="flex flex-col">
              <button
                onClick={() => moveSlide(i, -1)}
                disabled={i === 0 || isPending}
                className="rounded px-1 text-xs text-ink-faint hover:text-ink disabled:opacity-20"
              >
                ▲
              </button>
              <button
                onClick={() => moveSlide(i, 1)}
                disabled={i === slides.length - 1 || isPending}
                className="rounded px-1 text-xs text-ink-faint hover:text-ink disabled:opacity-20"
              >
                ▼
              </button>
            </div>

            {/* delete */}
            <button
              onClick={() => handleDelete(s.id)}
              disabled={isPending}
              title="מחיקה"
              className="rounded p-1 text-ink-faint hover:text-danger disabled:opacity-40"
            >
              🗑
            </button>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            הוסיפו שקופית ראשונה
          </p>
        )}
      </div>

      <div className="border-t border-border p-3">
        <p className="mb-2 px-1 text-xs font-semibold text-ink-faint">
          הוספת שקופית
        </p>
        <div className="grid grid-cols-2 gap-1.5">
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
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  const previewPanel = (
    <section
      className={cn(
        "flex items-center justify-center overflow-hidden p-6",
        mobileTab === "preview" ? "flex" : "hidden md:flex"
      )}
    >
      {selected ? (
        <div className="aspect-video w-full max-w-3xl rounded-card bg-surface p-8 shadow-[var(--shadow-soft)]">
          <PreviewBody slide={selected} presentationId={presentation.id} />
        </div>
      ) : (
        <p className="text-ink-faint">בחרו או הוסיפו שקופית</p>
      )}
    </section>
  );

  const editPanel = (
    <aside
      className={cn(
        "overflow-y-auto border-s border-border bg-surface p-5",
        mobileTab === "edit" ? "block" : "hidden md:block"
      )}
    >
      {selected ? (
        <EditPanel
          key={selected.id}
          slide={selected}
          onChange={(patch) => patchLocal(selected.id, patch)}
          onBlur={() => persist(slides.find((s) => s.id === selected.id)!)}
        />
      ) : (
        <p className="text-ink-faint">אין שקופית נבחרת</p>
      )}
    </aside>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
          ← חזרה
        </Link>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-bold text-ink">
          {presentation.title}
        </span>
        <form action={startSession.bind(null, presentation.id)}>
          <Button type="submit" size="sm">
            הצגה ▶
          </Button>
        </form>
      </div>

      {/* Mobile tab bar */}
      <div className="flex shrink-0 border-b border-border bg-surface md:hidden">
        {(
          [
            ["slides", "שקופיות"],
            ["preview", "תצוגה"],
            ["edit", "עריכה"],
          ] as [MobileTab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold transition",
              mobileTab === tab
                ? "border-b-2 border-brand text-brand"
                : "text-ink-faint"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 md:grid md:grid-cols-[260px_1fr_340px]">
        {slideListPanel}
        {previewPanel}
        {editPanel}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------
function PreviewBody({
  slide,
  presentationId,
}: {
  slide: Slide;
  presentationId: string;
}) {
  if (slide.type === "instructions") {
    const c = slide.content_json as { heading: string; subheading: string };
    const url = joinUrl(presentationId);
    const host = url.replace(/^https?:\/\//, "").replace(/\/play\/.*$/, "");
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <div>
          <h2 className="text-3xl font-black text-ink">
            {c.heading || "ברוכים הבאים"}
          </h2>
          {c.subheading && (
            <p className="mt-1 text-lg text-ink-soft">{c.subheading}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="flex flex-col gap-1 text-center">
            <p className="text-sm text-ink-soft">היכנסו לכתובת</p>
            <p className="text-base font-extrabold text-ink" dir="ltr">
              {host}/play
            </p>
            <p className="mt-2 text-sm text-ink-soft">והזינו את הקוד</p>
            <p
              className="text-3xl font-black tracking-[0.15em] text-brand"
              dir="ltr"
            >
              {formatRoomCode("12345678")}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <QRCodeSVG value={url} size={90} level="M" includeMargin={false} />
            <p className="mt-1.5 text-center text-xs text-ink-faint">
              סרקו להצטרפות
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === "text") {
    const c = slide.content_json as { markdown: string };
    const lines = (c.markdown || "").split("\n");
    return (
      <div className="h-full overflow-auto space-y-2 text-right text-ink">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) return <p key={i} className="text-3xl font-black">{line.slice(2)}</p>;
          if (line.startsWith("## ")) return <p key={i} className="text-2xl font-bold">{line.slice(3)}</p>;
          if (line.startsWith("### ")) return <p key={i} className="text-xl font-semibold">{line.slice(4)}</p>;
          const bullet = line.trimStart().startsWith("- ");
          if (!line.trim()) return <br key={i} />;
          return (
            <p key={i} className={`text-base${bullet ? " flex gap-2" : ""}`}>
              {bullet && <span className="text-brand">•</span>}
              <span>{bullet ? line.trimStart().slice(2) : line}</span>
            </p>
          );
        })}
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
          <div
            key={it.id}
            className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2"
          >
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt=""
            className="max-h-48 w-full rounded-xl object-contain"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-surface-2 text-ink-faint">
            הכניסו תמונה בפאנל העריכה
          </div>
        )}
      </div>
    );
  }

  const c = slide.content_json as { question?: string };
  return (
    <div className="flex h-full items-center justify-center text-center">
      <h2 className="text-2xl font-bold text-ink">{c.question ?? ""}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit panel
// ---------------------------------------------------------------------------
function EditPanel({
  slide,
  onChange,
  onBlur,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onBlur: () => void;
}) {
  const field =
    "h-11 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand";

  function setContent(content: Record<string, unknown>) {
    onChange({
      content_json: { ...slide.content_json, ...content } as never,
    });
  }

  return (
    <div className="flex flex-col gap-5" onBlur={onBlur}>
      <h3 className="font-bold text-ink">{TYPE_LABELS[slide.type]}</h3>

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
        <Labeled label="תוכן">
          <TextEditor
            value={(slide.content_json as { markdown: string }).markdown}
            onChange={(v) => setContent({ markdown: v })}
          />
        </Labeled>
      )}

      {(
        ["multiple_choice", "word_cloud", "ranking"] as SlideType[]
      ).includes(slide.type) && (
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
            value={
              (slide.content_json as WordCloudContent).maxEntriesPerUser
            }
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
          <Labeled label="תמונה">
            <ImageUploadField
              value={(slide.content_json as PinOnImageContent).imageUrl}
              onChange={(url) => {
                setContent({ imageUrl: url });
                onBlur();
              }}
            />
          </Labeled>
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

// ---------------------------------------------------------------------------
// Image upload field
// ---------------------------------------------------------------------------
function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("slide-images")
        .upload(path, file, { cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage
        .from("slide-images")
        .getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "שגיאה בהעלאה"
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
          dir="ltr"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
        >
          {uploading ? "..." : "↑ העלה"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {uploadError && (
        <p className="text-xs text-danger">{uploadError}</p>
      )}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="max-h-40 w-full rounded-lg object-contain"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice fields
// ---------------------------------------------------------------------------
function MultipleChoiceFields({
  content,
  setContent,
}: {
  content: MultipleChoiceContent;
  setContent: (c: Record<string, unknown>) => void;
}) {
  function setOption(id: string, label: string) {
    setContent({
      options: content.options.map((o) =>
        o.id === id ? { ...o, label } : o
      ),
    });
  }
  function addOption() {
    setContent({
      options: [
        ...content.options,
        {
          id: crypto.randomUUID(),
          label: `אפשרות ${content.options.length + 1}`,
        },
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

// ---------------------------------------------------------------------------
// Ranking fields
// ---------------------------------------------------------------------------
function RankingFields({
  content,
  setContent,
}: {
  content: RankingContent;
  setContent: (c: Record<string, unknown>) => void;
}) {
  function setItem(id: string, label: string) {
    setContent({
      items: content.items.map((it) =>
        it.id === id ? { ...it, label } : it
      ),
    });
  }
  function addItem() {
    if (content.items.length >= 6) return;
    setContent({
      items: [
        ...content.items,
        {
          id: crypto.randomUUID(),
          label: `פריט ${content.items.length + 1}`,
        },
      ],
    });
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
            <button
              onClick={() => removeItem(it.id)}
              className="px-2 text-ink-faint hover:text-danger"
            >
              ×
            </button>
          </div>
        ))}
        {content.items.length < 6 && (
          <button
            onClick={addItem}
            className="rounded-lg border border-dashed border-border py-2 text-sm text-ink-soft hover:bg-surface-2"
          >
            + הוספת פריט
          </button>
        )}
      </div>
    </Labeled>
  );
}

// ---------------------------------------------------------------------------
// Text editor with formatting toolbar
// ---------------------------------------------------------------------------
function TextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = useCallback(
    (before: string, after = before) => {
      const el = ref.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const next =
        value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(
          start + before.length,
          start + before.length + selected.length
        );
      }, 0);
    },
    [value, onChange]
  );

  const prefix = useCallback(
    (p: string) => {
      const el = ref.current;
      if (!el) return;
      const pos = el.selectionStart;
      const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
      const line = value.slice(lineStart);
      // Toggle: if line already starts with prefix, remove it
      const next = line.startsWith(p)
        ? value.slice(0, lineStart) + line.slice(p.length)
        : value.slice(0, lineStart) + p + value.slice(lineStart);
      onChange(next);
      const delta = line.startsWith(p) ? -p.length : p.length;
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(pos + delta, pos + delta);
      }, 0);
    },
    [value, onChange]
  );

  const tools = [
    { label: "ב", title: "מודגש", action: () => wrap("**") },
    { label: "H1", title: "כותרת גדולה", action: () => prefix("# ") },
    { label: "H2", title: "כותרת בינונית", action: () => prefix("## ") },
    { label: "H3", title: "כותרת קטנה", action: () => prefix("### ") },
    { label: "•", title: "נקודת רשימה", action: () => prefix("- ") },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border focus-within:border-brand">
      <div className="flex gap-1 border-b border-border bg-surface-2 p-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            onMouseDown={(e) => {
              e.preventDefault(); // keep textarea focus
              t.action();
            }}
            className="rounded px-2.5 py-1 text-sm font-bold text-ink hover:bg-surface"
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={9}
        placeholder={"# כותרת גדולה\n## כותרת בינונית\n- נקודת רשימה\n**מודגש**\nטקסט חופשי"}
        className="w-full resize-none bg-surface p-3 text-sm outline-none"
        dir="rtl"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labeled wrapper
// ---------------------------------------------------------------------------
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
