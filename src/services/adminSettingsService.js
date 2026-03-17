import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const ADMIN_SETTINGS_COLLECTION = "adminSettings";
const VALID_SESSIONS_COLLECTION = "adminValidSessions";
const CONFIG_DOC_ID = "config";
const DEFAULT_SESSION_TIMEOUT_MINUTES = 5;
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
        sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Admin settings init skipped:", e);
  }
}

/**
 * Fetch admin settings from Firebase
 * @returns {Promise<{adminPassword: string, sessionTimeoutMinutes: number}>}
 */
export async function getAdminSettings() {
  try {
    const ref = doc(db, ADMIN_SETTINGS_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return {
        adminPassword: DEFAULT_PASSWORD,
        sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
      };
    }
    const data = snap.data();
    const timeout = data?.sessionTimeoutMinutes;
    return {
      adminPassword: data?.adminPassword || DEFAULT_PASSWORD,
      sessionTimeoutMinutes:
        typeof timeout === "number" && timeout >= 1 && timeout <= 1440
          ? timeout
          : DEFAULT_SESSION_TIMEOUT_MINUTES,
    };
  } catch (e) {
    console.warn("Failed to fetch admin settings:", e);
    return {
      adminPassword: DEFAULT_PASSWORD,
      sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    };
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
 * @param {number} [sessionTimeoutMinutes] - Session duration in minutes (default from settings)
 * @returns {Promise<string>} Session token
 */
export async function createAdminSession(sessionTimeoutMinutes) {
  const minutes =
    typeof sessionTimeoutMinutes === "number" &&
    sessionTimeoutMinutes >= 1 &&
    sessionTimeoutMinutes <= 1440
      ? sessionTimeoutMinutes
      : DEFAULT_SESSION_TIMEOUT_MINUTES;
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
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
 * Update session timeout (auto-logout duration)
 * @param {number} minutes - Session duration in minutes (1–1440)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateSessionTimeout(minutes) {
  const val = Number(minutes);
  if (!Number.isFinite(val) || val < 1 || val > 1440) {
    return {
      success: false,
      error: "Session timeout must be between 1 and 1440 minutes (24 hours).",
    };
  }
  try {
    const ref = doc(db, ADMIN_SETTINGS_COLLECTION, CONFIG_DOC_ID);
    await setDoc(
      ref,
      {
        sessionTimeoutMinutes: Math.round(val),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return { success: true };
  } catch (e) {
    console.error("Failed to update session timeout:", e);
    return {
      success: false,
      error: e.message || "Failed to update session timeout.",
    };
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
