import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { fetchPlaylists } from "../services/playlistService";
import {
  getUserPlaylists,
  USER_PLAYLISTS_KEY,
  USER_PLAYLISTS_CHANGED,
} from "../utils/userPlaylistsStorage";

const PlaylistContext = createContext(null);

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState([]);
  const [userPlaylistsTick, setUserPlaylistsTick] = useState(0);

  useEffect(() => {
    const load = () =>
      fetchPlaylists()
        .then(setPlaylists)
        .catch((e) => {
          console.warn("[PlaylistContext] Failed to load playlists:", e);
          setPlaylists([]);
        });
    load();
  }, []);

  useEffect(() => {
    const bump = () => setUserPlaylistsTick((t) => t + 1);
    window.addEventListener(USER_PLAYLISTS_CHANGED, bump);
    const onStorage = (e) => {
      if (e.key === USER_PLAYLISTS_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(USER_PLAYLISTS_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const mergedPlaylists = useMemo(() => {
    const server = [...playlists].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const user = getUserPlaylists()
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const userRows = user.map((u) => ({
      id: u.id,
      name: u.name,
      image: "",
      trackIds: Array.isArray(u.trackIds) ? u.trackIds : [],
      order: 0,
      isUserPlaylist: true,
    }));
    /* User playlists first (newest among them first), then server playlists by order */
    return [...userRows, ...server];
  }, [playlists, userPlaylistsTick]);

  const playlistTrackIds = useMemo(() => {
    const map = {};
    mergedPlaylists.forEach((p) => {
      map[p.name] = p.trackIds || [];
    });
    return map;
  }, [mergedPlaylists]);

  const playlistImages = useMemo(
    () =>
      mergedPlaylists.map((p) => ({
        image: p.image,
        label: p.name,
        isUserPlaylist: Boolean(p.isUserPlaylist),
        id: p.isUserPlaylist ? p.id : undefined,
      })),
    [mergedPlaylists],
  );

  const getPlaylistByLabel = (label) =>
    mergedPlaylists.find((p) => p.name === label) || null;

  const value = {
    playlists: mergedPlaylists,
    playlistTrackIds,
    playlistImages,
    getPlaylistByLabel,
    refreshPlaylists: () => fetchPlaylists().then(setPlaylists),
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) {
    throw new Error("usePlaylist must be used within PlaylistProvider");
  }
  return ctx;
}
