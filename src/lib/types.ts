// ============================================================================
// OpenMenti - shared domain types
// content_json (slide config) and payload_json (aggregated results) are stored
// as jsonb; these discriminated unions give us strict typing on both sides.
// ============================================================================

export type SlideType =
  | "instructions"
  | "text"
  | "multiple_choice"
  | "word_cloud"
  | "open_ended"
  | "ranking"
  | "pin_on_image";

export type SessionStatus = "draft" | "active" | "ended";

// ---------------------------------------------------------------------------
// content_json shapes (one per slide type)
// ---------------------------------------------------------------------------
export interface InstructionsContent {
  heading: string;
  subheading: string;
}

export interface TextContent {
  /** Markdown body rendered for instructional slides. */
  markdown: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface MultipleChoiceContent {
  question: string;
  options: ChoiceOption[];
  allowMultiple: boolean;
}

export interface WordCloudContent {
  question: string;
  /** Max submissions allowed per participant. */
  maxEntriesPerUser: number;
}

export interface OpenEndedContent {
  question: string;
}

export interface RankingItem {
  id: string;
  label: string;
}

export interface RankingContent {
  question: string;
  items: RankingItem[]; // 3-5 items
}

export interface PinOnImageContent {
  question: string;
  imageUrl: string;
}

export type SlideContentMap = {
  instructions: InstructionsContent;
  text: TextContent;
  multiple_choice: MultipleChoiceContent;
  word_cloud: WordCloudContent;
  open_ended: OpenEndedContent;
  ranking: RankingContent;
  pin_on_image: PinOnImageContent;
};

export type SlideContent = SlideContentMap[SlideType];

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------
export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Slide<T extends SlideType = SlideType> {
  id: string;
  presentation_id: string;
  type: T;
  title: string;
  content_json: SlideContentMap[T];
  order_index: number;
  created_at: string;
}

export interface LiveSession {
  id: string;
  presentation_id: string;
  active_slide_id: string | null;
  room_code: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface AggregatedResult<P = ResultPayload> {
  id: string;
  slide_id: string;
  session_id: string | null;
  payload_json: P;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// payload_json shapes (aggregated results, one per interactive slide type)
// ---------------------------------------------------------------------------
export interface MultipleChoiceResult {
  kind: "multiple_choice";
  /** optionId -> vote count */
  tallies: Record<string, number>;
  totalVotes: number;
}

export interface WordCloudResult {
  kind: "word_cloud";
  /** normalized word -> count */
  frequencies: Record<string, number>;
  total: number;
}

export interface OpenEndedCard {
  id: string;
  text: string;
  at: number;
}
export interface OpenEndedResult {
  kind: "open_ended";
  cards: OpenEndedCard[];
}

export interface RankingResult {
  kind: "ranking";
  /** itemId -> weighted moving-average rank (lower = ranked higher) */
  weights: Record<string, number>;
  responses: number;
}

export interface Pin {
  id: string;
  xPct: number; // 0-100, relative to image container
  yPct: number; // 0-100
}
export interface PinOnImageResult {
  kind: "pin_on_image";
  pins: Pin[];
}

export type ResultPayload =
  | MultipleChoiceResult
  | WordCloudResult
  | OpenEndedResult
  | RankingResult
  | PinOnImageResult
  | Record<string, never>;

// ---------------------------------------------------------------------------
// Realtime broadcast message envelope (participant -> presenter)
// ---------------------------------------------------------------------------
export type VoteMessage =
  | { type: "mc_vote"; slideId: string; optionIds: string[]; voterId: string }
  | { type: "word_submit"; slideId: string; words: string[]; voterId: string }
  | { type: "open_submit"; slideId: string; text: string; voterId: string }
  | { type: "ranking_submit"; slideId: string; order: string[]; voterId: string }
  | { type: "pin_drop"; slideId: string; xPct: number; yPct: number; voterId: string };

/** Omit that distributes over a union so per-member fields survive. */
export type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

/** A vote as submitted by a participant, before the hook attaches voterId. */
export type VoteInput = DistributiveOmit<VoteMessage, "voterId">;

// Presenter -> participants (control channel, low frequency)
export interface ControlMessage {
  type: "slide_change";
  activeSlideId: string | null;
  status: SessionStatus;
}
