import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";

/** In-memory catalog; avoids repeated Firestore reads when many components call fetchMusicList */
let musicListCache = null;
let musicListInflight = null;

/** Call after admin adds/removes tracks so next fetch gets fresh data */
export const invalidateMusicListCache = () => {
  musicListCache = null;
};

/**
 * Fetch all music tracks from Firestore.
 * Concurrent callers share one request; results are cached for the SPA session.
 */
export const fetchMusicList = async () => {
  if (musicListCache) return musicListCache;
  if (musicListInflight) return musicListInflight;

  musicListInflight = (async () => {
    try {
      const q = query(collection(db, "music"), orderBy("uploadedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const tracks = [];

      querySnapshot.forEach((doc) => {
        tracks.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      musicListCache = tracks;
      return tracks;
    } finally {
      musicListInflight = null;
    }
  })();

  return musicListInflight;
};

/**
 * Format duration from seconds to MM:SS format
 * @param {number|string} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds) return "0:00";

  const totalSeconds =
    typeof seconds === "string" ? parseFloat(seconds) : seconds;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
