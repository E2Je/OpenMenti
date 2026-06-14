import type {
  MultipleChoiceResult,
  OpenEndedResult,
  PinOnImageResult,
  RankingResult,
  ResultPayload,
  SlideType,
  VoteMessage,
  WordCloudResult,
} from "./types";
import { cleanWords } from "./profanity";

// ============================================================================
// In-memory aggregators (presenter side).
//
// The presenter receives every vote over the websocket, folds it into a live
// payload, and a throttle persists that payload to `aggregated_results` once
// per 2s. On presenter reload we `hydrate()` from the last persisted payload so
// numbers survive a refresh. Per-voter maps let participants CHANGE their vote
// (multiple choice / ranking) without double counting within a session.
// ============================================================================

export interface Aggregator {
  apply(message: VoteMessage): void;
  toPayload(): ResultPayload;
  hydrate(payload: ResultPayload): void;
}

const MAX_OPEN_CARDS = 300;

class MultipleChoiceAggregator implements Aggregator {
  private byVoter = new Map<string, string[]>();
  private baseTallies: Record<string, number> = {};

  apply(m: VoteMessage) {
    if (m.type !== "mc_vote") return;
    this.byVoter.set(m.voterId, m.optionIds);
  }

  hydrate(payload: ResultPayload) {
    if ("kind" in payload && payload.kind === "multiple_choice") {
      this.baseTallies = { ...payload.tallies };
    }
  }

  toPayload(): MultipleChoiceResult {
    const tallies: Record<string, number> = { ...this.baseTallies };
    for (const optionIds of this.byVoter.values()) {
      for (const id of optionIds) tallies[id] = (tallies[id] ?? 0) + 1;
    }
    const totalVotes = Object.values(tallies).reduce((a, b) => a + b, 0);
    return { kind: "multiple_choice", tallies, totalVotes };
  }
}

class WordCloudAggregator implements Aggregator {
  private frequencies: Record<string, number> = {};
  private total = 0;

  apply(m: VoteMessage) {
    if (m.type !== "word_submit") return;
    for (const w of cleanWords(m.words)) {
      this.frequencies[w] = (this.frequencies[w] ?? 0) + 1;
      this.total += 1;
    }
  }

  hydrate(payload: ResultPayload) {
    if ("kind" in payload && payload.kind === "word_cloud") {
      this.frequencies = { ...payload.frequencies };
      this.total = payload.total;
    }
  }

  toPayload(): WordCloudResult {
    return { kind: "word_cloud", frequencies: this.frequencies, total: this.total };
  }
}

class OpenEndedAggregator implements Aggregator {
  private cards: OpenEndedResult["cards"] = [];

  apply(m: VoteMessage) {
    if (m.type !== "open_submit") return;
    const text = m.text.trim();
    if (!text) return;
    this.cards.push({ id: crypto.randomUUID(), text, at: Date.now() });
    if (this.cards.length > MAX_OPEN_CARDS) this.cards.shift();
  }

  hydrate(payload: ResultPayload) {
    if ("kind" in payload && payload.kind === "open_ended") {
      this.cards = [...payload.cards];
    }
  }

  toPayload(): OpenEndedResult {
    return { kind: "open_ended", cards: this.cards };
  }
}

class RankingAggregator implements Aggregator {
  private byVoter = new Map<string, string[]>();

  apply(m: VoteMessage) {
    if (m.type !== "ranking_submit") return;
    this.byVoter.set(m.voterId, m.order);
  }

  hydrate() {
    // Ranking persists only the derived weights; live per-voter orders restart
    // on reload. Acceptable for MVP - weights remain visible from the payload.
  }

  toPayload(): RankingResult {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const order of this.byVoter.values()) {
      order.forEach((itemId, idx) => {
        sums[itemId] = (sums[itemId] ?? 0) + (idx + 1); // rank 1-based
        counts[itemId] = (counts[itemId] ?? 0) + 1;
      });
    }
    const weights: Record<string, number> = {};
    for (const id of Object.keys(sums)) weights[id] = sums[id] / counts[id];
    return { kind: "ranking", weights, responses: this.byVoter.size };
  }
}

class PinAggregator implements Aggregator {
  private pins: PinOnImageResult["pins"] = [];

  apply(m: VoteMessage) {
    if (m.type !== "pin_drop") return;
    this.pins.push({ id: crypto.randomUUID(), xPct: m.xPct, yPct: m.yPct });
  }

  hydrate(payload: ResultPayload) {
    if ("kind" in payload && payload.kind === "pin_on_image") {
      this.pins = [...payload.pins];
    }
  }

  toPayload(): PinOnImageResult {
    return { kind: "pin_on_image", pins: this.pins };
  }
}

export function createAggregator(slideType: SlideType): Aggregator | null {
  switch (slideType) {
    case "multiple_choice":
      return new MultipleChoiceAggregator();
    case "word_cloud":
      return new WordCloudAggregator();
    case "open_ended":
      return new OpenEndedAggregator();
    case "ranking":
      return new RankingAggregator();
    case "pin_on_image":
      return new PinAggregator();
    default:
      return null; // instructions / text have nothing to aggregate
  }
}
