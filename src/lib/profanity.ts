// ============================================================================
// Client-side profanity filter for the Word Cloud.
// Intentionally small + local (no network). Matches are dropped before a word
// ever reaches the aggregated payload, so banned words are never displayed or
// persisted. Extend the lists as needed for your audience.
// ============================================================================

// Lowercased English stems (substring match after normalization).
const EN_BANNED = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "whore",
  "slut",
  "nigger",
  "faggot",
  "retard",
];

// Hebrew banned terms (exact-ish, normalized of niqqud/punctuation).
const HE_BANNED = [
  "זין",
  "זיון",
  "כוס",
  "כוסית",
  "שרמוטה",
  "זונה",
  "מניאק",
  "בן זונה",
  "תחת",
  "חרא",
  "מזדיין",
  "מזדיינת",
  "נאצי",
];

/** Strip niqqud, collapse whitespace, lowercase. */
export function normalizeWord(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud / cantillation
    .replace(/[^\p{L}\p{N} ]+/gu, "") // keep letters, numbers, spaces
    .trim()
    .toLowerCase();
}

export function isProfane(word: string): boolean {
  const w = normalizeWord(word);
  if (!w) return true; // drop empties
  if (EN_BANNED.some((b) => w.includes(b))) return true;
  if (HE_BANNED.some((b) => w.includes(b))) return true;
  return false;
}

/**
 * Normalize a batch of submitted words, drop profanity + empties, and cap
 * length so a single submission can't flood the cloud.
 */
export function cleanWords(words: string[], maxLen = 40): string[] {
  const out: string[] = [];
  for (const raw of words) {
    const w = normalizeWord(raw).slice(0, maxLen);
    if (!w || isProfane(w)) continue;
    out.push(w);
  }
  return out;
}
