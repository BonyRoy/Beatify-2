import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/config";

const PLAYLISTS_COLLECTION = "playlists";

/**
 * Feels themes as normal playlists.
 * `image` is a filename under /public/playlistbg/ (same convention as other playlists).
 * Matching files also live under /public/feels/ for the Feels page backgrounds.
 */
export const FEELS_PLAYLISTS = [
  { name: "Truck", image: "truck.jpg" },
  { name: "Ganpati", image: "ganpati.jpg" },
  { name: "Salon", image: "salon.jpg" },
  { name: "Navratri", image: "navratri.jpg" },
];

let ensureFeelsInflight = null;

/**
 * Ensure Feels theme playlists exist once each, with correct playlistbg images.
 * Does not overwrite existing trackIds. Removes duplicate name entries.
 */
export async function ensureFeelsPlaylists() {
  if (ensureFeelsInflight) return ensureFeelsInflight;

  ensureFeelsInflight = (async () => {
    try {
      const existing = await fetchPlaylists();
      const byName = new Map();

      for (const playlist of existing) {
        const key = String(playlist.name || "").trim().toLowerCase();
        if (!key) continue;
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(playlist);
      }

      for (const feels of FEELS_PLAYLISTS) {
        const key = feels.name.toLowerCase();
        const matches = byName.get(key) || [];

        if (matches.length === 0) {
          await createPlaylist({
            name: feels.name,
            image: feels.image,
            trackIds: [],
          });
          continue;
        }

        // Keep the entry with the most tracks; delete extras (double creates)
        matches.sort(
          (a, b) => (b.trackIds?.length || 0) - (a.trackIds?.length || 0)
        );
        const [keeper, ...dupes] = matches;

        if (keeper.image !== feels.image) {
          await updatePlaylist(keeper.id, { image: feels.image });
        }

        for (const dupe of dupes) {
          await deletePlaylist(dupe.id);
        }
      }

      return { success: true };
    } catch (e) {
      console.error("Failed to ensure Feels playlists:", e);
      return { success: false, error: e.message };
    } finally {
      ensureFeelsInflight = null;
    }
  })();

  return ensureFeelsInflight;
}

/**
 * Fetch all playlists from Firestore
 * @returns {Promise<Array<{id: string, name: string, image: string, trackIds: string[], order: number}>>}
 */
export async function fetchPlaylists() {
  try {
    const ref = collection(db, PLAYLISTS_COLLECTION);
    let snap;
    try {
      const q = query(ref, orderBy("order", "asc"));
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(ref);
    }
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        image: data.image || "",
        trackIds: Array.isArray(data.trackIds) ? data.trackIds : [],
        order: typeof data.order === "number" ? data.order : 0,
      };
    });
    list.sort((a, b) => a.order - b.order);
    return list;
  } catch (e) {
    console.warn("Failed to fetch playlists:", e);
    return [];
  }
}

/**
 * Create a playlist
 */
export async function createPlaylist({ name, image, trackIds = [] }) {
  try {
    const ref = doc(collection(db, PLAYLISTS_COLLECTION));
    const snap = await getDocs(collection(db, PLAYLISTS_COLLECTION));
    const order = snap.size;
    await setDoc(ref, {
      name: (name || "").trim(),
      image: (image || "").trim(),
      trackIds: Array.isArray(trackIds) ? trackIds : [],
      order,
      updatedAt: new Date().toISOString(),
    });
    return { id: ref.id, success: true };
  } catch (e) {
    console.error("Failed to create playlist:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Update a playlist
 */
export async function updatePlaylist(id, { name, image, trackIds }) {
  try {
    const ref = doc(db, PLAYLISTS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: "Playlist not found" };
    const updates = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = String(name).trim();
    if (image !== undefined) updates.image = String(image).trim();
    if (trackIds !== undefined) updates.trackIds = Array.isArray(trackIds) ? trackIds : [];
    await setDoc(ref, { ...snap.data(), ...updates }, { merge: true });
    return { success: true };
  } catch (e) {
    console.error("Failed to update playlist:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(id) {
  try {
    const ref = doc(db, PLAYLISTS_COLLECTION, id);
    await deleteDoc(ref);
    return { success: true };
  } catch (e) {
    console.error("Failed to delete playlist:", e);
    return { success: false, error: e.message };
  }
}
