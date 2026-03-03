/**
 * Utilities for scoring tracks by relevance to user's listening history.
 * Used to surface related songs at the top for logged-in users.
 */

const ARTIST_SPLIT_REGEX = /\s*[,&|]\s*|\s+and\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+/i;

/**
 * Extract artist names from a track's artist string (e.g. "A, B & C" -> ["a","b","c"])
 */
const getArtistNames = (artistStr) =>
  (artistStr || "")
    .split(ARTIST_SPLIT_REGEX)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/**
 * Check if track's artist matches any of the preferred artist names.
 * Uses contains check (e.g. "Mohit Chauhan" matches "Mohit Chauhan, Shekhar Ravjiani")
 */
const trackMatchesArtist = (track, artistName) => {
  const names = getArtistNames(track.artist);
  const target = (artistName || "").trim().toLowerCase();
  if (!target) return false;
  return names.some((n) => n.includes(target) || target.includes(n));
};

/**
 * Compute relevance score for a track based on user's listening history.
 * Higher score = more relevant = shown first.
 *
 * @param {Object} track - { artist, genre, uuid }
 * @param {Array<{name, count}>} topArtists - Top 3 artists from listening history
 * @param {Array<{uuid, artist}>} lastSongs - Last 10 listened songs
 * @param {Map<string, string>} uuidToGenre - Map of track uuid -> genre (from musicList)
 */
export const getTrackRelevanceScore = (
  track,
  topArtists = [],
  lastSongs = [],
  uuidToGenre = new Map(),
) => {
  let score = 0;
  const trackArtist = track.artist || "";
  const trackGenre = (track.genre || "").trim().toLowerCase();

  // Top artists: 1st = 40, 2nd = 30, 3rd = 20
  topArtists.forEach((a, rank) => {
    if (trackMatchesArtist(track, a.name)) {
      score += 40 - rank * 10;
    }
  });

  // Last listened: same artist = +8 each
  const lastArtistSet = new Set();
  lastSongs.forEach((s) => {
    const names = getArtistNames(s.artist);
    names.forEach((n) => lastArtistSet.add(n));
  });
  lastArtistSet.forEach((artistName) => {
    if (trackMatchesArtist(track, artistName)) {
      score += 8;
    }
  });

  // Same genre as any last listened track = +5
  lastSongs.forEach((s) => {
    const genre = uuidToGenre.get(s.uuid);
    if (genre && trackGenre && genre.toLowerCase() === trackGenre) {
      score += 5;
    }
  });

  return score;
};

/**
 * Sort tracks by relevance (highest first). Preserves original order for same score.
 */
export const sortTracksByRelevance = (
  tracks,
  topArtists = [],
  lastSongs = [],
  musicList = [],
) => {
  if (!tracks.length || (!topArtists.length && !lastSongs.length)) {
    return [...tracks];
  }

  const uuidToGenre = new Map();
  musicList.forEach((t) => {
    const id = t.uuid || t.id;
    if (id && t.genre) uuidToGenre.set(id, t.genre);
  });

  return [...tracks].sort((a, b) => {
    const scoreA = getTrackRelevanceScore(
      a,
      topArtists,
      lastSongs,
      uuidToGenre,
    );
    const scoreB = getTrackRelevanceScore(
      b,
      topArtists,
      lastSongs,
      uuidToGenre,
    );
    if (scoreB !== scoreA) return scoreB - scoreA;
    return 0;
  });
};
