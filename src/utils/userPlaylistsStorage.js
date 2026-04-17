import { deleteUserPlaylistCover } from "./userPlaylistCoverIdb";

export const USER_PLAYLISTS_KEY = "beatify_user_playlists";
export const USER_PLAYLISTS_CHANGED = "beatify-user-playlists-changed";

export function getUserPlaylists() {
  try {
    const raw = localStorage.getItem(USER_PLAYLISTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * @param {{ name: string, trackIds: string[] }} param
 * @returns {string} new playlist id
 */
export function addUserPlaylist({ name, trackIds }) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Playlist name is required.");
  if (!Array.isArray(trackIds) || trackIds.length === 0) {
    throw new Error("Select at least one song.");
  }
  const list = getUserPlaylists();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `pl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  list.push({
    id,
    name: trimmed,
    trackIds: trackIds.map((x) => String(x)),
    createdAt: Date.now(),
  });
  localStorage.setItem(USER_PLAYLISTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(USER_PLAYLISTS_CHANGED));
  return id;
}

/**
 * @param {string} id
 * @param {{ name: string, trackIds: string[] }} param
 */
export function updateUserPlaylistById(id, { name, trackIds }) {
  if (!id) throw new Error("Playlist id is required.");
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Playlist name is required.");
  if (!Array.isArray(trackIds) || trackIds.length === 0) {
    throw new Error("Select at least one song.");
  }
  const list = getUserPlaylists();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Playlist not found.");
  list[idx] = {
    ...list[idx],
    name: trimmed,
    trackIds: trackIds.map((x) => String(x)),
  };
  localStorage.setItem(USER_PLAYLISTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(USER_PLAYLISTS_CHANGED));
}

/**
 * @param {string} id
 * @returns {boolean} true if a playlist was removed
 */
export function deleteUserPlaylistById(id) {
  if (!id) return false;
  const list = getUserPlaylists();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  localStorage.setItem(USER_PLAYLISTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(USER_PLAYLISTS_CHANGED));
  deleteUserPlaylistCover(id).catch(() => {});
  return true;
}
