import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const ADMIN_SETTINGS_COLLECTION = "adminSettings";
const VALID_SESSIONS_COLLECTION = "adminValidSessions";
const CONFIG_DOC_ID = "config";
const SESSION_EXPIRY_HOURS = 24;
const SESSION_EXPIRY_MINUTES = 1; // Use for testing; set to null to use hours
const DEFAULT_PASSWORD = "8369877891";

/**
 * Initialize admin settings if document doesn't exist (first-time setup)
 */
export async function initAdminSettingsIfNeeded() {
  try {
    const ref = doc(db, ADMIN_SETTINGS_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        adminPassword: DEFAULT_PASSWORD,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Admin settings init skipped:", e);
  }
}

/**
 * Fetch admin settings from Firebase
 * @returns {Promise<{adminPassword: string}>}
 */
export async function getAdminSettings() {
  try {
    const ref = doc(db, ADMIN_SETTINGS_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { adminPassword: DEFAULT_PASSWORD };
    }
    const data = snap.data();
    return {
      adminPassword: data?.adminPassword || DEFAULT_PASSWORD,
    };
  } catch (e) {
    console.warn("Failed to fetch admin settings:", e);
    return { adminPassword: DEFAULT_PASSWORD };
  }
}

/**
 * Update admin password (requires current password)
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateAdminPassword(currentPassword, newPassword) {
  try {
    const settings = await getAdminSettings();
    if (settings.adminPassword !== currentPassword) {
      return { success: false, error: "Current password is incorrect." };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "New password must be at least 6 characters." };
    }
    const ref = doc(db, ADMIN_SETTINGS_COLLECTION, CONFIG_DOC_ID);
    await setDoc(
      ref,
      {
        adminPassword: newPassword.trim(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return { success: true };
  } catch (e) {
    console.error("Failed to update admin password:", e);
    return { success: false, error: e.message || "Failed to update password." };
  }
}

/**
 * Create a session token and store in Firestore
 * @returns {Promise<string>} Session token
 */
export async function createAdminSession() {
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date();
  if (SESSION_EXPIRY_MINUTES) {
    expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_EXPIRY_MINUTES);
  } else {
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);
  }
  try {
    const ref = doc(db, VALID_SESSIONS_COLLECTION, token);
    await setDoc(ref, {
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return token;
  } catch (e) {
    console.warn("Failed to create session:", e);
    return token;
  }
}

/**
 * Verify session token against Firestore
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function verifyAdminSession(token) {
  if (!token || !token.trim()) return false;
  try {
    const ref = doc(db, VALID_SESSIONS_COLLECTION, token.trim());
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    const expiresAt = data?.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      await deleteDoc(ref);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Session verification failed:", e);
    return false;
  }
}

/**
 * Invalidate session (logout)
 * @param {string} token
 */
export async function invalidateAdminSession(token) {
  if (!token) return;
  try {
    const ref = doc(db, VALID_SESSIONS_COLLECTION, token.trim());
    await deleteDoc(ref);
  } catch (e) {
    console.warn("Failed to invalidate session:", e);
  }
}
