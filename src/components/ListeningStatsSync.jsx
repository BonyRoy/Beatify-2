import { useEffect, useRef, useState } from "react";
import { useCreateAccount } from "../context/CreateAccountContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";
import {
  saveUserListeningStats,
  getUserListeningStats,
} from "../services/userListeningStatsService";
import { getAccountByName } from "../services/accountService";

const FAVORITES_CHANGED = "beatify-favorites-changed";
export const FAVORITES_LOADED = "beatify-favorites-loaded";

export const dispatchFavoritesChanged = () => {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED));
};

/**
 * When user is logged in, sync last 10 songs, top 3 artists, and favorites to Firestore.
 * Fetches favorites from cloud on login for cross-device sync.
 */
const ListeningStatsSync = () => {
  const { isLoggedIn, accountId, userName } = useCreateAccount();
  const { lastSongs, artistCounts, getTopArtists } = useListeningHistory();
  const debounceRef = useRef(null);
  const [resolvedAccountId, setResolvedAccountId] = useState(accountId || "");
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const fetchedForAccountRef = useRef(null);

  // Resolve accountId from userName when missing
  useEffect(() => {
    if (accountId) {
      setResolvedAccountId(accountId);
      return;
    }
    if (!isLoggedIn || !userName?.trim()) return;
    let cancelled = false;
    getAccountByName(userName.trim())
      .then((acc) => {
        if (!cancelled && acc?.id) {
          setResolvedAccountId(acc.id);
          try {
            localStorage.setItem("beatify_account_id", acc.id);
          } catch {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accountId, isLoggedIn, userName]);

  // Reset fetch ref when logged out
  useEffect(() => {
    if (!isLoggedIn) fetchedForAccountRef.current = null;
  }, [isLoggedIn]);

  // Fetch favorites from cloud when accountId is available (login on new device)
  useEffect(() => {
    const id = resolvedAccountId || accountId;
    if (!isLoggedIn || !id || fetchedForAccountRef.current === id) return;
    fetchedForAccountRef.current = id;
    let cancelled = false;
    getUserListeningStats(id)
      .then((stats) => {
        if (cancelled || !stats?.favorites?.length) return;
        try {
          localStorage.setItem("favorites", JSON.stringify(stats.favorites));
          window.dispatchEvent(new CustomEvent(FAVORITES_LOADED));
        } catch {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn, resolvedAccountId, accountId]);

  // Listen for favorites changes to trigger sync
  useEffect(() => {
    const handler = () => setFavoritesVersion((v) => v + 1);
    window.addEventListener(FAVORITES_CHANGED, handler);
    return () => window.removeEventListener(FAVORITES_CHANGED, handler);
  }, []);

  // Sync to Firestore (last 10 songs, top 3 artists, favorites)
  useEffect(() => {
    const id = resolvedAccountId || accountId;
    if (!isLoggedIn || !id) return;

    const sync = () => {
      const top3 = getTopArtists(3);
      let favorites = [];
      try {
        const raw = localStorage.getItem("favorites");
        favorites = raw ? JSON.parse(raw) : [];
      } catch {}
      saveUserListeningStats(id, userName, lastSongs, top3, favorites).catch(
        (e) => console.warn("Failed to sync listening stats:", e),
      );
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(sync, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    isLoggedIn,
    resolvedAccountId,
    accountId,
    userName,
    lastSongs,
    artistCounts,
    favoritesVersion,
  ]);

  return null;
};

export default ListeningStatsSync;
