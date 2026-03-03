import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useCreateAccount } from "./CreateAccountContext";
import { getUserListeningStats, updateUserFavorites } from "../services/userListeningStatsService";
import { getAccountByName } from "../services/accountService";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { isLoggedIn, accountId, userName } = useCreateAccount();
  const [favorites, setFavorites] = useState([]);
  const [resolvedAccountId, setResolvedAccountId] = useState(accountId || "");
  const fetchedForRef = React.useRef(null);

  // Resolve accountId when missing (legacy sessions)
  useEffect(() => {
    if (accountId) {
      setResolvedAccountId(accountId);
      return;
    }
    if (!isLoggedIn || !userName?.trim()) return;
    let cancelled = false;
    getAccountByName(userName.trim())
      .then((acc) => {
        if (!cancelled && acc?.id) setResolvedAccountId(acc.id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accountId, isLoggedIn, userName]);

  // Clear when logged out
  useEffect(() => {
    if (!isLoggedIn) {
      setFavorites([]);
      fetchedForRef.current = null;
    }
  }, [isLoggedIn]);

  // Fetch favorites from Firebase when logged in
  useEffect(() => {
    const id = resolvedAccountId || accountId;
    if (!isLoggedIn || !id || fetchedForRef.current === id) return;
    fetchedForRef.current = id;
    let cancelled = false;
    getUserListeningStats(id)
      .then((stats) => {
        if (cancelled) return;
        const favs = Array.isArray(stats?.favorites) ? stats.favorites : [];
        setFavorites(favs);
      })
      .catch(() => {
        if (!cancelled) setFavorites([]);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, resolvedAccountId, accountId]);

  const toggleFavorite = useCallback(
    async (trackIdentifier) => {
      const id = resolvedAccountId || accountId;
      if (!isLoggedIn || !id) {
        return false; // Must be logged in to add favorites
      }
      const newFavorites = favorites.includes(trackIdentifier)
        ? favorites.filter((favId) => favId !== trackIdentifier)
        : [...favorites, trackIdentifier];
      setFavorites(newFavorites);
      try {
        await updateUserFavorites(id, newFavorites);
        return true;
      } catch (e) {
        setFavorites(favorites); // Revert on error
        console.warn("Failed to save favorite:", e);
        return false;
      }
    },
    [isLoggedIn, resolvedAccountId, accountId, favorites],
  );

  const isFavorite = useCallback(
    (trackIdentifier) => favorites.includes(trackIdentifier),
    [favorites],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        isLoggedIn,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
