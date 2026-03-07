import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const FEEDBACK_COLLECTION = "feedback";

/**
 * Submit feedback (for logged-in users - no OTP)
 * @param {Object} params - { userName, email, contactNumber?, message }
 * @returns {Promise<string>} Document ID
 */
export async function submitFeedback(params) {
  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), {
    userName: (params.userName || "").trim(),
    email: (params.email || "").trim().toLowerCase(),
    contactNumber: (params.contactNumber || "").trim() || null,
    message: (params.message || "").trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Create and send OTP for feedback (for non-logged-in users)
 * Reuses song request OTP flow
 */
export { createAndSendOtp, verifyOtp } from "./songRequestService";

/**
 * Fetch all feedback from Firebase (for admin)
 * @returns {Promise<Array>} Array of feedback with id
 */
export async function fetchFeedback() {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  const list = [];
  snapshot.forEach((docSnap) => {
    list.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });
  return list;
}

/**
 * Delete a single feedback entry
 * @param {string} id - Document ID
 */
export async function deleteFeedback(id) {
  await deleteDoc(doc(db, FEEDBACK_COLLECTION, id));
}

/**
 * Delete all feedback entries
 */
export async function clearAllFeedback() {
  const list = await fetchFeedback();
  await Promise.all(list.map((fb) => deleteDoc(doc(db, FEEDBACK_COLLECTION, fb.id))));
}
