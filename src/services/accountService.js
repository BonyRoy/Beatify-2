import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const ACCOUNTS_COLLECTION = "accounts";

/**
 * Check if an email already has an account (one email = one account)
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email is registered
 */
export async function isEmailTaken(email) {
  if (!email || !email.trim()) return false;
  const trimmed = (email || "").trim();
  const normalized = trimmed.toLowerCase();
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where("emailLower", "==", normalized)
  );
  let snapshot = await getDocs(q);
  if (!snapshot.empty) return true;
  const q2 = query(
    collection(db, ACCOUNTS_COLLECTION),
    where("email", "==", trimmed)
  );
  snapshot = await getDocs(q2);
  return !snapshot.empty;
}

/**
 * Check if a display name is already taken (case-insensitive)
 * @param {string} name - Display name to check
 * @returns {Promise<boolean>} True if name is taken
 */
export async function isNameTaken(name) {
  if (!name || !name.trim()) return false;
  const normalized = name.trim().toLowerCase();
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where("nameLower", "==", normalized)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Create a new account (name must be unique)
 * @param {Object} account - { name, email, uuid }
 * @throws {Error} If name is already taken
 * @returns {Promise<string>} Document ID
 */
export async function createAccount({ name, email, uuid }) {
  const trimmedName = name.trim();
  const trimmedEmail = (email || "").trim();
  const trimmedUuid = (uuid || "").trim();

  if (!trimmedName) {
    throw new Error("Name is required.");
  }
  if (!trimmedEmail) {
    throw new Error("Email is required.");
  }
  if (!trimmedUuid) {
    throw new Error("UUID is required.");
  }

  const emailTaken = await isEmailTaken(trimmedEmail);
  if (emailTaken) {
    throw new Error("This email is already registered. Sign in instead.");
  }

  const nameTaken = await isNameTaken(trimmedName);
  if (nameTaken) {
    throw new Error("This name is already used. Please choose another.");
  }

  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), {
    name: trimmedName,
    nameLower: trimmedName.toLowerCase(),
    email: trimmedEmail,
    emailLower: trimmedEmail.toLowerCase(),
    uuid: trimmedUuid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get account by document ID
 * @param {string} id - Account document ID
 * @returns {Promise<Object|null>} Account object or null
 */
export async function getAccountById(id) {
  if (!id || !id.trim()) return null;
  const ref = doc(db, ACCOUNTS_COLLECTION, id.trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Update account avatar
 * @param {string} accountId - Account document ID
 * @param {string|null} avatarId - Avatar ID (one, two, etc.) or null for default
 */
export async function updateAccountAvatar(accountId, avatarId) {
  if (!accountId || !accountId.trim()) {
    throw new Error("Account ID is required.");
  }
  const ref = doc(db, ACCOUNTS_COLLECTION, accountId.trim());
  await updateDoc(ref, { avatarId: avatarId || null, updatedAt: serverTimestamp() });
}

/**
 * Get account by display name (for listening stats sync fallback)
 * @param {string} name - Display name to look up
 * @returns {Promise<Object|null>} Account object or null
 */
export async function getAccountByName(name) {
  if (!name || !name.trim()) return null;
  const normalized = name.trim().toLowerCase();
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where("nameLower", "==", normalized)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Get account by email (for sign in)
 * @param {string} email - Email to look up
 * @returns {Promise<Object|null>} Account object or null
 */
export async function getAccountByEmail(email) {
  if (!email || !email.trim()) return null;
  const trimmed = (email || "").trim();
  const normalized = trimmed.toLowerCase();
  let q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where("emailLower", "==", normalized)
  );
  let snapshot = await getDocs(q);
  if (snapshot.empty) {
    q = query(
      collection(db, ACCOUNTS_COLLECTION),
      where("email", "==", trimmed)
    );
    snapshot = await getDocs(q);
  }
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Delete an account (for admin)
 * @param {string} id - Document ID
 */
export async function deleteAccount(id) {
  await deleteDoc(doc(db, ACCOUNTS_COLLECTION, id));
}

/**
 * Fetch all accounts (for admin)
 * @returns {Promise<Array>} Array of accounts with id
 */
export async function fetchAccounts() {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const accounts = [];
  querySnapshot.forEach((docSnap) => {
    accounts.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });
  return accounts;
}
