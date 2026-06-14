"use client";

import type {
  InstructionsContent,
  MultipleChoiceContent,
  MultipleChoiceResult,
  OpenEndedResult,
  PinOnImageContent,
  PinOnImageResult,
  RankingContent,
  RankingResult,
  ResultPayload,
  Slide,
  TextContent,
  WordCloudContent,
  WordCloudResult as WCResult,
} from "@/lib/types";
import { BarChartResult } from "./BarChartResult";
import { WordCloudResult } from "./WordCloudResult";
import { JoinPanel } from "./JoinPanel";

export function PresenterSlide({
  slide,
  payload,
  presentationId,
  roomCode,
}: {
  slide: Slide;
  payload: ResultPayload;
  presentationId: string;
  roomCode: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-12 py-10 text-center">
      {slide.title && slide.type !== "instructions" && (
        <h2 className="max-w-5xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">
          {slide.title}
        </h2>
      )}

      {slide.type === "instructions" && (
        <InstructionsView
          content={slide.content_json as InstructionsContent}
          presentationId={presentationId}
          roomCode={roomCode}
        />
      )}

      {slide.type === "text" && (
        <TextView content={slide.content_json as TextContent} />
      )}

      {slide.type === "multiple_choice" && (
        <div id="om-capture" className="w-full max-w-4xl rounded-card bg-surface p-2">
          <BarChartResult
            options={(slide.content_json as MultipleChoiceContent).options}
            result={asKind<MultipleChoiceResult>(payload, "multiple_choice")}
          />
        </div>
      )}

      {slide.type === "word_cloud" && (
        <div id="om-capture" className="flex min-h-[40vh] w-full max-w-5xl items-center justify-center rounded-card bg-surface p-8">
          <WordCloudResult result={asKind<WCResult>(payload, "word_cloud")} />
        </div>
      )}

      {slide.type === "open_ended" && (
        <OpenEndedView result={asKind<OpenEndedResult>(payload, "open_ended")} />
      )}

      {slide.type === "ranking" && (
        <RankingView
          content={slide.content_json as RankingContent}
          result={asKind<RankingResult>(payload, "ranking")}
        />
      )}

      {slide.type === "pin_on_image" && (
        <PinOnImageView
          content={slide.content_json as PinOnImageContent}
          result={asKind<PinOnImageResult>(payload, "pin_on_image")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------
function InstructionsView({
  content, presentationId, roomCode,
}: {
  content: InstructionsContent;
  presentationId: string;
  roomCode: string;
}) {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black text-ink md:text-6xl">
          {content.heading || "ברוכים הבאים"}
        </h1>
        {content.subheading && (
          <p className="text-2xl text-ink-soft">{content.subheading}</p>
        )}
      </div>
      <JoinPanel presentationId={presentationId} roomCode={roomCode} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
function TextView({ content }: { content: TextContent }) {
  const lines = (content.markdown || "").split("\n");
  return (
    <div className="max-w-3xl space-y-3 text-right text-2xl leading-relaxed text-ink">
      {lines.map((line, i) => {
        const bullet = line.trimStart().startsWith("- ");
        const text = bullet ? line.trimStart().slice(2) : line;
        return (
          <p key={i} className={bullet ? "flex gap-2" : ""}>
            {bullet && <span className="text-brand">•</span>}
            <span dangerouslySetInnerHTML={{ __html: inlineBold(text) }} />
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Open Ended - scrollable card grid
// ---------------------------------------------------------------------------
function OpenEndedView({ result }: { result: OpenEndedResult | null }) {
  const cards = result?.cards ?? [];
  return (
    <div id="om-capture" className="w-full max-w-6xl">
      {cards.length === 0 ? (
        <p className="text-2xl text-ink-faint">ממתינים לתשובות...</p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
          {[...cards].reverse().map((card) => (
            <div
              key={card.id}
              className="animate-[om-pop-in_0.3s_ease] rounded-2xl bg-surface p-5 text-right text-lg font-medium text-ink shadow-[var(--shadow-soft)]"
            >
              {card.text}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-ink-faint">{cards.length} תשובות</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranking - sorted bars by average weight (lower avg rank = higher placement)
// ---------------------------------------------------------------------------
function RankingView({
  content,
  result,
}: {
  content: RankingContent;
  result: RankingResult | null;
}) {
  const items = content.items ?? [];
  const weights = result?.weights ?? {};
  const responses = result?.responses ?? 0;

  const sorted = [...items].sort((a, b) => {
    const wa = weights[a.id] ?? Infinity;
    const wb = weights[b.id] ?? Infinity;
    return wa - wb;
  });

  const maxW = Math.max(...Object.values(weights), 1);

  return (
    <div id="om-capture" className="w-full max-w-3xl">
      <div className="flex flex-col gap-4">
        {sorted.map((item, rank) => {
          const w = weights[item.id];
          const pct = w != null ? Math.round(((maxW - w) / maxW) * 100) : 0;
          return (
            <div key={item.id} className="flex items-center gap-4">
              <span className="w-8 text-2xl font-black text-brand">{rank + 1}</span>
              <div className="flex flex-1 flex-col gap-1 text-right">
                <span className="font-semibold text-ink">{item.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${w != null ? Math.max(pct, 4) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-faint">{responses} משיבים</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pin on Image - image with dots overlay
// ---------------------------------------------------------------------------
function PinOnImageView({
  content,
  result,
}: {
  content: PinOnImageContent;
  result: PinOnImageResult | null;
}) {
  const pins = result?.pins ?? [];

  if (!content.imageUrl) {
    return <p className="text-2xl text-ink-faint">לא הוגדרה תמונה</p>;
  }

  return (
    <div id="om-capture" className="relative w-full max-w-4xl">
      <div className="relative overflow-hidden rounded-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.imageUrl} alt="" className="w-full" />
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-white bg-brand opacity-80 shadow" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-faint">{pins.length} סימונים</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inlineBold(s: string): string {
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function asKind<T extends { kind: string }>(
  payload: ResultPayload,
  kind: T["kind"]
): T | null {
  if (payload && "kind" in payload && payload.kind === kind) {
    return payload as unknown as T;
  }
  return null;
}
