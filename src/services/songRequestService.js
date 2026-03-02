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

const SONG_REQUESTS_COLLECTION = "songRequests";

/**
 * Submit a song request to Firebase
 * @param {Object} request - { songName, album, userName, contactNumber }
 * @returns {Promise<string>} Document ID
 */
export async function submitSongRequest(request) {
  const docRef = await addDoc(collection(db, SONG_REQUESTS_COLLECTION), {
    songName: request.songName,
    album: request.album,
    userName: request.userName,
    contactNumber: request.contactNumber,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch all song requests from Firebase (for admin)
 * @returns {Promise<Array>} Array of song requests with id
 */
export async function fetchSongRequests() {
  const q = query(
    collection(db, SONG_REQUESTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const requests = [];
  querySnapshot.forEach((doc) => {
    requests.push({
      id: doc.id,
      ...doc.data(),
    });
  });
  return requests;
}

/**
 * Delete a song request from Firebase
 * @param {string} id - Document ID
 */
export async function deleteSongRequest(id) {
  await deleteDoc(doc(db, SONG_REQUESTS_COLLECTION, id));
}
