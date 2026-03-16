/**
 * Guest play limit: 4 songs per day for non-logged-in users.
 * Stored in localStorage, renewed after 24 hours.
 */

const GUEST_PLAYS_KEY = "beatify_guest_plays";
const GUEST_PLAYS_MAX = 4;
const GUEST_RENEW_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Get guest plays from localStorage. If older than 24h, clear and return renewed state.
 * @returns {{ uuids: string[], timestamp: number | null, renewed: boolean }}
 */
export function getGuestPlays() {
  try {
    const raw = localStorage.getItem(GUEST_PLAYS_KEY);
    if (!raw) return { uuids: [], timestamp: null, renewed: false };

    const data = JSON.parse(raw);
    const uuids = Array.isArray(data?.uuids) ? data.uuids : [];
    const timestamp = typeof data?.timestamp === "number" ? data.timestamp : null;
    const now = Date.now();

    if (timestamp && now - timestamp > GUEST_RENEW_MS) {
      localStorage.removeItem(GUEST_PLAYS_KEY);
      return { uuids: [], timestamp: null, renewed: true };
    }
    return { uuids, timestamp, renewed: false };
  } catch {
    return { uuids: [], timestamp: null, renewed: false };
  }
}

/**
 * Add a play (uuid) to guest plays. Each play counts, including repeats.
 * @param {string} uuid - Track uuid or id
 */
export function addGuestPlay(uuid) {
  if (!uuid) return;
  const sid = String(uuid).trim();
  if (!sid) return;
  try {
    const { uuids, timestamp } = getGuestPlays();
    const newUuids = [...uuids, sid];
    const newTimestamp = timestamp || Date.now();
    localStorage.setItem(
      GUEST_PLAYS_KEY,
      JSON.stringify({ uuids: newUuids, timestamp: newTimestamp })
    );
  } catch (e) {
    console.warn("Failed to save guest play:", e);
  }
}

/**
 * Check if guest can play one more song.
 * @returns {{ canPlay: boolean, count: number, renewed: boolean }}
 */
export function checkGuestCanPlay() {
  const { uuids, renewed } = getGuestPlays();
  const count = uuids.length;
  const canPlay = count < GUEST_PLAYS_MAX;
  return { canPlay, count, renewed };
}

export { GUEST_PLAYS_MAX };
