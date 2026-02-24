/**
 * Fuzzy search utilities using Levenshtein distance.
 * Matches when similarity >= 75% (e.g. "ra one" matches "ra.one", "ravan" matches "ra.one").
 */

const SIMILARITY_THRESHOLD = 0.75;

/**
 * Normalize string for search: lowercase, remove punctuation, collapse spaces.
 * "Ra.One" -> "raone", "ra one" -> "raone"
 */
export const normalizeForSearch = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation (dots, etc.)
    .replace(/\s+/g, "") // collapse spaces
    .trim();
};

/**
 * Levenshtein (edit) distance between two strings.
 */
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Similarity score: 1 - (distance / maxLength). 1 = identical, 0 = completely different.
 */
const similarity = (a, b) => {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
};

/**
 * Check if query fuzzy-matches text (>= 75% similarity).
 * - Normalizes both strings (handles "ra one" vs "ra.one")
 * - If normalized text contains normalized query -> match
 * - Otherwise uses Levenshtein similarity
 */
export const fuzzyMatches = (query, text, threshold = SIMILARITY_THRESHOLD) => {
  if (!query || !text) return false;
  const nq = normalizeForSearch(query);
  const nt = normalizeForSearch(text);
  if (!nq) return true; // empty query matches all
  if (nt.includes(nq) || nq.includes(nt)) return true;
  return similarity(nq, nt) >= threshold;
};

/**
 * Check if query fuzzy-matches any of the given text fields.
 */
export const fuzzyMatchesAny = (query, ...texts) => {
  if (!query) return true;
  return texts.some((t) => fuzzyMatches(query, t || ""));
};
