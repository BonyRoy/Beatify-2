import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const FEATURED_STORY_COLLECTION = "featuredStory";
const CONFIG_DOC_ID = "config";

/**
 * Fetch featured story config from Firestore (public - no auth)
 * Returns null if doc doesn't exist or fetch fails - no defaults.
 * @returns {Promise<{byline: string, brand: string, tagline: string, bannerImageUrl: string, songTitle: string, songDescription: string, featuredTrackUuid: string} | null>}
 */
export async function fetchFeaturedStory() {
  try {
    const ref = doc(db, FEATURED_STORY_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      byline: data?.byline ?? "",
      brand: data?.brand ?? "",
      tagline: data?.tagline ?? "",
      bannerImageUrl: data?.bannerImageUrl ?? "",
      songTitle: data?.songTitle ?? "",
      songDescription: data?.songDescription ?? "",
      featuredTrackUuid: data?.featuredTrackUuid ?? "",
    };
  } catch (e) {
    console.warn("Failed to fetch featured story:", e);
    return null;
  }
}

/**
 * Update featured story config (admin only)
 * @param {Object} data - Partial or full story config
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateFeaturedStory(data) {
  try {
    const ref = doc(db, FEATURED_STORY_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};
    const updates = {
      ...existing,
      ...(data.byline !== undefined && { byline: String(data.byline).trim() }),
      ...(data.brand !== undefined && { brand: String(data.brand).trim() }),
      ...(data.tagline !== undefined && { tagline: String(data.tagline).trim() }),
      ...(data.bannerImageUrl !== undefined && {
        bannerImageUrl: String(data.bannerImageUrl).trim(),
      }),
      ...(data.songTitle !== undefined && {
        songTitle: String(data.songTitle).trim(),
      }),
      ...(data.songDescription !== undefined && {
        songDescription: String(data.songDescription).trim(),
      }),
      ...(data.featuredTrackUuid !== undefined && {
        featuredTrackUuid: String(data.featuredTrackUuid).trim(),
      }),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, updates, { merge: true });
    return { success: true };
  } catch (e) {
    console.error("Failed to update featured story:", e);
    return { success: false, error: e.message || "Update failed." };
  }
}
