/**
 * Utilities for scoring tracks by relevance to user's listening history.
 * Balances familiar (artist/genre) with discovery (new songs) and era preference.
 */

const ARTIST_SPLIT_REGEX = /\s*[,&|]\s*|\s+and\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+/i;

const getYearFromReleaseDate = (releaseDate) => {
  if (!releaseDate) return null;
  const str = String(releaseDate).trim();
  const year = parseInt(str.slice(0, 4), 10);
  return !isNaN(year) && year >= 1900 && year <= 2100 ? year : null;
};

const getEraFromYear = (year) => {
  if (!year) return null;
  if (year >= 1940 && year <= 1949) return "40s";
  if (year >= 1950 && year <= 1959) return "50s";
  if (year >= 1960 && year <= 1969) return "60s";
  if (year >= 1970 && year <= 1979) return "70s";
  if (year >= 1980 && year <= 1989) return "80s";
  if (year >= 1990 && year <= 1999) return "90s";
  if (year >= 2000 && year <= 2009) return "2000s";
  if (year >= 2010 && year <= 2019) return "2010s";
  if (year >= 2020 && year <= 2029) return "2020s";
  return null;
};

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
 * Balances: familiar (artist/genre), discovery (new songs), and era preference.
 * Higher score = more relevant = shown first.
 *
 * @param {Object} track - { artist, genre, uuid, releaseDate }
 * @param {Array<{name, count}>} topArtists - Top 3 artists from listening history
 * @param {Array<{uuid, artist}>} lastSongs - Last 50 listened songs
 * @param {Map<string, string>} uuidToGenre - Map of track uuid -> genre (from musicList)
 * @param {Set<string>} listenedUuids - UUIDs of songs user has listened to (for discovery)
 * @param {Set<string>} preferredEras - Eras from user's listening (70s, 80s, etc.)
 * @param {Map<string, string>} uuidToEra - Map of track uuid -> era (from musicList)
 */
export const getTrackRelevanceScore = (
  track,
  topArtists = [],
  lastSongs = [],
  uuidToGenre = new Map(),
  listenedUuids = new Set(),
  preferredEras = new Set(),
  uuidToEra = new Map(),
) => {
  let score = 0;
  const trackArtist = track.artist || "";
  const trackGenre = (track.genre || "").trim().toLowerCase();
  const trackId = track.uuid || track.id;

  // Penalty: recently played songs should not be re-recommended (position-based)
  const recentIndex = lastSongs.findIndex((s) => (s.uuid || s.id) === trackId);
  if (recentIndex >= 0) {
    if (recentIndex < 10) score -= 200;      // last 10: very strong
    else if (recentIndex < 25) score -= 140; // 11–25: strong
    else if (recentIndex < 40) score -= 80;  // 26–40: medium
    else score -= 40;                         // 41–50: light
  }

  // Discovery: prefer NEW songs user hasn't listened to (+40)
  const isNew = trackId && !listenedUuids.has(trackId);
  if (isNew) score += 40;

  // Era: boost tracks in eras user listens to (+18)
  const trackEra =
    uuidToEra.get(trackId) ||
    getEraFromYear(getYearFromReleaseDate(track.releaseDate));
  if (trackEra && preferredEras.has(trackEra)) score += 18;

  // Familiar: top artists - 1st = 35, 2nd = 25, 3rd = 15
  topArtists.forEach((a, rank) => {
    if (trackMatchesArtist(track, a.name)) {
      score += 35 - rank * 10;
    }
  });

  // Last listened: same artist = +6 each
  const lastArtistSet = new Set();
  lastSongs.forEach((s) => {
    const names = getArtistNames(s.artist);
    names.forEach((n) => lastArtistSet.add(n));
  });
  lastArtistSet.forEach((artistName) => {
    if (trackMatchesArtist(track, artistName)) {
      score += 6;
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
 * Sort tracks by relevance (highest first).
 * Balances discovery (new songs), era preference, and familiar artists/genres.
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
  const uuidToEra = new Map();
  musicList.forEach((t) => {
    const id = t.uuid || t.id;
    if (id) {
      if (t.genre) uuidToGenre.set(id, t.genre);
      const year = getYearFromReleaseDate(t.releaseDate);
      const era = getEraFromYear(year);
      if (era) uuidToEra.set(id, era);
    }
  });

  const listenedUuids = new Set(lastSongs.map((s) => s.uuid).filter(Boolean));
  const preferredEras = new Set();
  lastSongs.forEach((s) => {
    const era = uuidToEra.get(s.uuid);
    if (era) preferredEras.add(era);
  });

  return [...tracks].sort((a, b) => {
    const scoreA = getTrackRelevanceScore(
      a,
      topArtists,
      lastSongs,
      uuidToGenre,
      listenedUuids,
      preferredEras,
      uuidToEra,
    );
    const scoreB = getTrackRelevanceScore(
      b,
      topArtists,
      lastSongs,
      uuidToGenre,
      listenedUuids,
      preferredEras,
      uuidToEra,
    );
    if (scoreB !== scoreA) return scoreB - scoreA;
    return 0;
  });
};
