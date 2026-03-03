import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/config";

const COLLECTION = "userListeningStats";

/**
 * Save or update listening stats for a user (last 10 songs, top 3 artists, favorites)
 * @param {string} accountId - Firestore account document ID
 * @param {string} userName - Display name
 * @param {Array<{uuid, name, artist, album}>} last10Songs
 * @param {Array<{name, count}>} top3Artists
 * @param {Array<string>} favorites - Track UUIDs
 */
export async function saveUserListeningStats(accountId, userName, last10Songs, top3Artists, favorites = []) {
  if (!accountId || !accountId.trim()) return;
  const ref = doc(db, COLLECTION, accountId.trim());
  await setDoc(ref, {
    accountId: accountId.trim(),
    userName: userName || "",
    last10Songs: last10Songs || [],
    top3Artists: top3Artists || [],
    favorites: Array.isArray(favorites) ? favorites : [],
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Fetch a single user's listening stats (for loading on login)
 * @param {string} accountId - Firestore account document ID
 * @returns {Promise<Object|null>} User stats or null
 */
export async function getUserListeningStats(accountId) {
  if (!accountId || !accountId.trim()) return null;
  const ref = doc(db, COLLECTION, accountId.trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Fetch all user listening stats (for admin)
 * @returns {Promise<Array<{id, accountId, userName, last10Songs, top3Artists, updatedAt}>>}
 */
export async function fetchAllUserListeningStats() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const list = [];
  snapshot.forEach((docSnap) => {
    list.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });
  list.sort((a, b) => {
    const aVal = a.updatedAt || "";
    const bVal = b.updatedAt || "";
    return bVal.localeCompare(aVal);
  });
  return list;
}
