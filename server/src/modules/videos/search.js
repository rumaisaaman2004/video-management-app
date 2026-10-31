const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const MAX_SEARCH_WORDS = 8;

/**
 * Turns free text into a prefix-matching full-text query, so results appear
 * while the user is still typing: "react hoo" → "react:* & hoo:*".
 *
 * Only letters and digits survive, so input can never inject tsquery operators.
 * Returns null when nothing searchable remains.
 */
export function buildSearch(text) {
  const words = (text?.toLowerCase().match(WORD_PATTERN) ?? []).slice(0, MAX_SEARCH_WORDS);
  if (words.length === 0) return null;

  return { words, tsQuery: words.map((word) => `${word}:*`).join(' & ') };
}
