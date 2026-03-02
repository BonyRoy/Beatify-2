import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { sendOtpEmail } from "./otpEmailService";

const SONG_REQUESTS_COLLECTION = "songRequests";
const OTP_COLLECTION = "songRequestOtps";

const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Create OTP, store in Firebase, and send via EmailJS
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @returns {Promise<string>} OTP document ID (for verification)
 */
export async function createAndSendOtp(email, userName) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const docRef = await addDoc(collection(db, OTP_COLLECTION), {
    email: email.toLowerCase().trim(),
    otp,
    userName: userName || "User",
    expiresAt,
    createdAt: serverTimestamp(),
  });

  await sendOtpEmail(email, otp, userName || "User");
  return docRef.id;
}

/**
 * Verify OTP and delete it from Firebase
 * @param {string} email - User's email
 * @param {string} otp - OTP entered by user
 * @returns {Promise<boolean>} True if valid
 */
export async function verifyOtp(email, otp) {
  const q = query(
    collection(db, OTP_COLLECTION),
    where("email", "==", email.toLowerCase().trim())
  );
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    if (data.otp === otp && expiresAt > new Date()) {
      await deleteDoc(doc(db, OTP_COLLECTION, docSnap.id));
      return true;
    }
  }
  return false;
}

/**
 * Submit a song request to Firebase (after OTP verification)
 * @param {Object} request - { songName, album, userName, contactNumber, email }
 * @returns {Promise<string>} Document ID
 */
export async function submitSongRequest(request) {
  const docRef = await addDoc(collection(db, SONG_REQUESTS_COLLECTION), {
    songName: request.songName,
    album: request.album,
    userName: request.userName,
    contactNumber: request.contactNumber,
    email: request.email || null,
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
