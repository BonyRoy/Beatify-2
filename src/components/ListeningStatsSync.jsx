import { useEffect, useRef, useState } from "react";
import { useCreateAccount } from "../context/CreateAccountContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";
import { useFavorites } from "../context/FavoritesContext";
import { saveUserListeningStats } from "../services/userListeningStatsService";
import { getAccountByName } from "../services/accountService";

/**
 * When user is logged in, sync last 10 songs and top 3 artists to Firestore.
 * Favorites are handled by FavoritesContext (saved directly to Firebase on toggle).
 */
const ListeningStatsSync = () => {
  const { isLoggedIn, accountId, userName } = useCreateAccount();
  const { lastSongs, artistCounts, getTopArtists } = useListeningHistory();
  const { favorites: favList } = useFavorites();
  const debounceRef = useRef(null);
  const [resolvedAccountId, setResolvedAccountId] = useState(accountId || "");

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

  // Sync to Firestore (last 10 songs, top 3 artists, favorites from FavoritesContext)
  useEffect(() => {
    const id = resolvedAccountId || accountId;
    if (!isLoggedIn || !id) return;

    const sync = () => {
      const top3 = getTopArtists(3);
      saveUserListeningStats(id, userName, lastSongs, top3, favList).catch(
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
    favList,
  ]);

  return null;
};

export default ListeningStatsSync;
