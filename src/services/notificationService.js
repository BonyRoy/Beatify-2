import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const NOTIFICATIONS_COLLECTION = "notifications";

/**
 * Create a "song added" notification when admin marks a request as fulfilled
 * @param {Object} params - { email, userName, songName, album }
 * @returns {Promise<string>} Document ID
 */
export async function createSongAddedNotification({ email, userName, songName, album }) {
  if (!email || !email.trim()) return null;
  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    type: "song_added",
    email: email.toLowerCase().trim(),
    userName: userName || "",
    songName: songName || "",
    album: album || "",
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch notifications for a user by email
 * @param {string} email - User's email
 * @returns {Promise<Array>} Array of notifications with id, sorted by createdAt desc
 */
export async function fetchNotificationsByEmail(email) {
  if (!email || !email.trim()) return [];
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("email", "==", email.toLowerCase().trim())
  );
  const snapshot = await getDocs(q);
  const notifications = [];
  snapshot.forEach((docSnap) => {
    notifications.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });
  notifications.sort((a, b) => {
    const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return tb - ta;
  });
  return notifications;
}

/**
 * Mark a notification as read
 * @param {string} id - Notification document ID
 */
export async function markNotificationRead(id) {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), { read: true });
}

/**
 * Mark all notifications as read for a user
 * @param {string} email - User's email
 */
export async function markAllNotificationsRead(email) {
  if (!email || !email.trim()) return;
  const notifications = await fetchNotificationsByEmail(email);
  await Promise.all(
    notifications.filter((n) => !n.read).map((n) => markNotificationRead(n.id))
  );
}

/**
 * Delete a notification
 * @param {string} id - Notification document ID
 */
export async function deleteNotification(id) {
  await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
}

/**
 * Delete all notifications for a user
 * @param {string} email - User's email
 */
export async function clearAllNotifications(email) {
  if (!email || !email.trim()) return;
  const notifications = await fetchNotificationsByEmail(email);
  await Promise.all(notifications.map((n) => deleteNotification(n.id)));
}
