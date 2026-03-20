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

const USER_STORY_SUBMISSIONS_COLLECTION = "userStorySubmissions";

/**
 * Submit a user story (logged-in users only)
 * @param {Object} data - { title, story, accountId, userName, userEmail }
 * @returns {Promise<string>} Document ID
 */
export async function submitUserStory(data) {
  const docRef = await addDoc(
    collection(db, USER_STORY_SUBMISSIONS_COLLECTION),
    {
      title: (data.title || "").trim(),
      story: (data.story || "").trim(),
      accountId: data.accountId || "",
      userName: data.userName || "",
      userEmail: data.userEmail || "",
      createdAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

/**
 * Fetch all user story submissions (for admin)
 * @returns {Promise<Array>} Array of submissions with id
 */
export async function fetchUserStorySubmissions() {
  const q = query(
    collection(db, USER_STORY_SUBMISSIONS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const submissions = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    submissions.push({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    });
  });
  return submissions;
}

/**
 * Delete a user story submission
 * @param {string} id - Document ID
 */
export async function deleteUserStorySubmission(id) {
  await deleteDoc(doc(db, USER_STORY_SUBMISSIONS_COLLECTION, id));
}
