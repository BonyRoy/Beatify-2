import React, { createContext, useContext, useState, useEffect } from "react";
import { getEraFromReleaseDate } from "../utils/trackRelevanceUtils";

const STORAGE_KEY = "artistPlayCounts";
const STORAGE_ERA_KEY = "eraPlayCounts";
const STORAGE_LAST_SONGS = "beatify_last10_songs";
const MAX_LAST_SONGS = 50;

const ListeningHistoryContext = createContext();

export const useListeningHistory = () => {
  const ctx = useContext(ListeningHistoryContext);
  if (!ctx)
    throw new Error(
      "useListeningHistory must be used within ListeningHistoryProvider",
    );
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

const loadEraFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_ERA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const loadLastSongsFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_SONGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (counts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (e) {
    console.warn("Failed to save artist play counts:", e);
  }
};

const saveEraToStorage = (counts) => {
  try {
    localStorage.setItem(STORAGE_ERA_KEY, JSON.stringify(counts));
  } catch (e) {
    console.warn("Failed to save era play counts:", e);
  }
};

const saveLastSongsToStorage = (songs) => {
  try {
    localStorage.setItem(STORAGE_LAST_SONGS, JSON.stringify(songs));
  } catch (e) {
    console.warn("Failed to save last songs:", e);
  }
};

export const ListeningHistoryProvider = ({ children }) => {
  const [artistCounts, setArtistCounts] = useState(loadFromStorage);
  const [eraCounts, setEraCounts] = useState(loadEraFromStorage);
  const [lastSongs, setLastSongs] = useState(loadLastSongsFromStorage);

  useEffect(() => {
    saveToStorage(artistCounts);
  }, [artistCounts]);

  useEffect(() => {
    saveEraToStorage(eraCounts);
  }, [eraCounts]);

  useEffect(() => {
    saveLastSongsToStorage(lastSongs);
  }, [lastSongs]);

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

  const recordTrackPlay = (track) => {
    if (!track?.uuid && !track?.id) return;
    const uuid = track.uuid || track.id;
    const era = getEraFromReleaseDate(track.releaseDate);
    if (era) {
      setEraCounts((prev) => ({
        ...prev,
        [era]: (prev[era] || 0) + 1,
      }));
    }
    const entry = {
      uuid,
      name: track.name || "Unknown",
      artist: track.artist || "Unknown",
      album: track.album || "",
      playedAt: new Date().toISOString(),
    };
    setLastSongs((prev) => {
      const filtered = prev.filter((s) => s.uuid !== uuid);
      const next = [entry, ...filtered].slice(0, MAX_LAST_SONGS);
      return next;
    });
  };

  const getTopArtists = (limit = 3) => {
    return Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  };

  const getTopEras = (limit = 3) => {
    return Object.entries(eraCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  };

  const getLastSongs = () => [...lastSongs];

  return (
    <ListeningHistoryContext.Provider
      value={{
        recordArtistPlay,
        recordTrackPlay,
        getTopArtists,
        getTopEras,
        getLastSongs,
        artistCounts,
        eraCounts,
        lastSongs,
      }}
    >
      {children}
    </ListeningHistoryContext.Provider>
  );
};
