import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase/config";

const COLLECTION = "trackPlayCounts";
const DOC_ID = "global";

/**
 * Fetch all track play counts from Firebase
 * @returns {Promise<Record<string, number>>} Map of track UUID -> play count
 */
export async function fetchTrackPlayCounts() {
  try {
    const ref = doc(db, COLLECTION, DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return {};
    }
    const data = snap.data();
    return data?.counts && typeof data.counts === "object" ? data.counts : {};
  } catch (e) {
    console.warn("Failed to fetch track play counts:", e);
    return {};
  }
}

/**
 * Increment play count for a track (atomic). Creates doc if needed.
 * @param {string} trackUuid - Track UUID
 */
export async function incrementTrackPlayCount(trackUuid) {
  if (!trackUuid || !String(trackUuid).trim()) return;

  const ref = doc(db, COLLECTION, DOC_ID);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { counts: { [trackUuid]: 1 } }, { merge: true });
      return;
    }
    await updateDoc(ref, {
      [`counts.${trackUuid}`]: increment(1),
    });
  } catch (e) {
    console.warn("Failed to increment track play count:", e);
  }
}
