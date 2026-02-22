import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "artistPlayCounts";

const ListeningHistoryContext = createContext();

export const useListeningHistory = () => {
  const ctx = useContext(ListeningHistoryContext);
  if (!ctx) throw new Error("useListeningHistory must be used within ListeningHistoryProvider");
  return ctx;
};

const splitArtistString = (str) =>
  (str || "")
    .split(/\s*[,&|]\s*|\s+and\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

const migrateCombinedArtists = (counts) => {
  const next = {};
  for (const [key, count] of Object.entries(counts)) {
    const parts = splitArtistString(key);
    if (parts.length > 1) {
      for (const name of parts) {
        next[name] = (next[name] || 0) + count;
      }
    } else if (parts.length === 1) {
      next[parts[0]] = (next[parts[0]] || 0) + count;
    }
  }
  return next;
};

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const counts = raw ? JSON.parse(raw) : {};
    return migrateCombinedArtists(counts);
  } catch {
    return {};
  }
};

const saveToStorage = (counts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (e) {
    console.warn("Failed to save artist play counts:", e);
  }
};

export const ListeningHistoryProvider = ({ children }) => {
  const [artistCounts, setArtistCounts] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(artistCounts);
  }, [artistCounts]);

  const recordArtistPlay = (artistName) => {
    const names = splitArtistString(artistName);
    if (names.length === 0) return;
    setArtistCounts((prev) => {
      const next = { ...prev };
      for (const name of names) {
        next[name] = (next[name] || 0) + 1;
      }
      return next;
    });
  };

  const getTopArtists = (limit = 3) => {
    return Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  };

  return (
    <ListeningHistoryContext.Provider value={{ recordArtistPlay, getTopArtists, artistCounts }}>
      {children}
    </ListeningHistoryContext.Provider>
  );
};
