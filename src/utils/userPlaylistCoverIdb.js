const DB_NAME = "beatify_user_playlist_covers_v1";
const DB_VERSION = 1;
const STORE = "covers";

export const USER_PLAYLIST_COVER_CHANGED = "beatify-user-playlist-cover-changed";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "playlistId" });
      }
    };
  });
}

/**
 * @param {string} playlistId
 * @param {Blob} blob
 */
export async function saveUserPlaylistCoverBlob(playlistId, blob) {
  if (!playlistId || !blob) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent(USER_PLAYLIST_COVER_CHANGED));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({ playlistId, blob, updatedAt: Date.now() });
  });
}

/**
 * @param {string} playlistId
 * @returns {Promise<Blob | null>}
 */
export async function getUserPlaylistCoverBlob(playlistId) {
  if (!playlistId) return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(playlistId);
      req.onsuccess = () => resolve(req.result?.blob ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * @param {string} playlistId
 */
export async function deleteUserPlaylistCover(playlistId) {
  if (!playlistId) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent(USER_PLAYLIST_COVER_CHANGED));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(playlistId);
    });
  } catch {
    // ignore
  }
}

/**
 * Resize/compress image for storage (max edge maxDim, JPEG).
 * @param {File} file
 * @param {number} [maxDim=512]
 * @returns {Promise<Blob>}
 */
export function compressImageFileForPlaylistCover(file, maxDim = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error("Invalid image"));
        return;
      }
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not encode image"));
        },
        "image/jpeg",
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
