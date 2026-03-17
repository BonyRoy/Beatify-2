import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchPlaylists } from "../services/playlistService";

const PlaylistContext = createContext(null);

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState([]);

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

  const playlistTrackIds = {};
  playlists.forEach((p) => {
    playlistTrackIds[p.name] = p.trackIds || [];
  });

  const playlistImages = playlists.map((p) => ({
    image: p.image,
    label: p.name,
  }));

  const getPlaylistByLabel = (label) =>
    playlists.find((p) => p.name === label) || null;

  const value = {
    playlists,
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
