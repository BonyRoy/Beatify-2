/**
 * IndexedDB cache: keeps audio blobs for the user's top 100 most-listened tracks
 * (local listen counts). Playback prefers cached blob URLs over network.
 */

const DB_NAME = "beatify_audio_cache";
const DB_VERSION = 1;
const STATS_STORE = "listenStats";
const BLOBS_STORE = "blobs";
export const TOP_TRACKS_CACHE_LIMIT = 100;

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STATS_STORE)) {
          db.createObjectStore(STATS_STORE, { keyPath: "trackId" });
        }
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: "trackId" });
        }
      };
    });
  }
  return dbPromise.catch(() => null);
}

function getTrackId(track) {
  const id = track?.uuid ?? track?.id;
  return id != null ? String(id) : "";
}

function getSourceUrl(track) {
  return track?.fileUrl || track?.url || "";
}

/**
 * Same-origin proxy for Firebase Storage — browser fetch() needs CORS; the
 * Vite dev server and Vercel `/api/storage-proxy` mirror AlbumArtContext.
 * Always store the canonical HTTPS URL in IndexedDB; only use this for fetch().
 */
function getFetchableUrlForStorage(url) {
  if (typeof window === "undefined" || !url) return url;
  if (!url.startsWith("https://firebasestorage.googleapis.com/")) return url;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return (
      "/storage-proxy" +
      url.slice("https://firebasestorage.googleapis.com".length)
    );
  }
  return "/api/storage-proxy?url=" + encodeURIComponent(url);
}

/**
 * Sort by listen count desc, then lastPlayed desc (ties favor more recent).
 */
function topTrackIds(statsRows, limit) {
  const sorted = [...statsRows].sort((a, b) => {
    const dc = (b.listenCount || 0) - (a.listenCount || 0);
    if (dc !== 0) return dc;
    return (b.lastPlayed || 0) - (a.lastPlayed || 0);
  });
  return new Set(sorted.slice(0, limit).map((r) => r.trackId));
}

async function getAllStats(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATS_STORE, "readonly");
    const req = tx.objectStore(STATS_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putStat(db, row) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATS_STORE, "readwrite");
    tx.objectStore(STATS_STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteBlob(db, trackId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readwrite");
    tx.objectStore(BLOBS_STORE).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlobRow(db, trackId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readonly");
    const req = tx.objectStore(BLOBS_STORE).get(trackId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function putBlobRow(db, row) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readwrite");
    tx.objectStore(BLOBS_STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllBlobIds(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readonly");
    const req = tx.objectStore(BLOBS_STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * After a meaningful listen (e.g. 30s), bump local listen count and keep only
 * top 100 tracks' blobs; evict the rest (lowest listen counts drop out).
 */
export async function recordPersonalListen(track) {
  const trackId = getTrackId(track);
  if (!trackId) return;

  const db = await openDb();
  if (!db) return;

  let stats;
  try {
    stats = await getAllStats(db);
  } catch {
    return;
  }

  const now = Date.now();
  const existing = stats.find((s) => s.trackId === trackId);
  const listenCount = (existing?.listenCount || 0) + 1;
  await putStat(db, {
    trackId,
    listenCount,
    lastPlayed: now,
  });

  let merged;
  try {
    merged = await getAllStats(db);
  } catch {
    return;
  }

  const keepIds = topTrackIds(merged, TOP_TRACKS_CACHE_LIMIT);

  let blobIds = [];
  try {
    blobIds = await getAllBlobIds(db);
  } catch {
    return;
  }

  for (const bid of blobIds) {
    if (!keepIds.has(String(bid))) {
      try {
        await deleteBlob(db, bid);
      } catch {
        /* ignore */
      }
    }
  }

  if (keepIds.has(trackId)) {
    const row = await getBlobRow(db, trackId).catch(() => null);
    const src = getSourceUrl(track);
    const needsFetch =
      !row ||
      !row.blob ||
      (src && row.sourceUrl && row.sourceUrl !== src);
    if (needsFetch && src) {
      fetchAndStoreBlob(db, trackId, src).catch(() => {});
    }
  }
}

async function fetchAndStoreBlob(db, trackId, sourceUrl) {
  const fetchUrl = getFetchableUrlForStorage(sourceUrl);
  const res = await fetch(fetchUrl, { mode: "cors", credentials: "omit" });
  if (!res.ok) return;
  const blob = await res.blob();
  if (!blob || blob.size === 0) return;
  await putBlobRow(db, { trackId, blob, sourceUrl });
}

/**
 * Resolve URL for playback: use IndexedDB blob if present and URL matches.
 * Caller must revoke returned blob URLs via onRevoke when done.
 */
export async function resolvePlayUrl(track) {
  const trackId = getTrackId(track);
  const sourceUrl = getSourceUrl(track);
  if (!trackId || !sourceUrl) {
    return { url: sourceUrl, isBlob: false, revoke: null };
  }

  const db = await openDb();
  if (!db) {
    return { url: sourceUrl, isBlob: false, revoke: null };
  }

  let row;
  try {
    row = await getBlobRow(db, trackId);
  } catch {
    row = null;
  }

  if (
    row?.blob &&
    row.sourceUrl === sourceUrl &&
    typeof URL !== "undefined" &&
    URL.createObjectURL
  ) {
    const title = track?.name || "(unknown)";
    console.log(
      "[Beatify] Playing from IndexedDB cache",
      { trackId, title, bytes: row.blob.size },
    );
    const url = URL.createObjectURL(row.blob);
    return {
      url,
      isBlob: true,
      revoke: () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      },
    };
  }

  return { url: sourceUrl, isBlob: false, revoke: null };
}

/**
 * Background fetch for preload / warm cache when network is used.
 */
export async function cacheBlobFromNetworkIfTop(track) {
  const trackId = getTrackId(track);
  const sourceUrl = getSourceUrl(track);
  if (!trackId || !sourceUrl) return;

  const db = await openDb();
  if (!db) return;

  let merged;
  try {
    merged = await getAllStats(db);
  } catch {
    return;
  }

  const keepIds = topTrackIds(merged, TOP_TRACKS_CACHE_LIMIT);
  if (!keepIds.has(trackId)) return;

  const row = await getBlobRow(db, trackId).catch(() => null);
  if (row?.blob && row.sourceUrl === sourceUrl) return;

  await fetchAndStoreBlob(db, trackId, sourceUrl);
}

