import React, { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playlist, setPlaylist] = useState([]);

  const selectTrack = (track, tracksList = null) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    // Update playlist if tracksList is provided
    if (tracksList && Array.isArray(tracksList)) {
      setPlaylist(tracksList);
    }
  };

  const getCurrentTrackIndex = () => {
    if (!currentTrack || !playlist.length) return -1;
    const trackId = currentTrack.uuid || currentTrack.id;
    return playlist.findIndex((track) => (track.uuid || track.id) === trackId);
  };

  const playNextTrack = () => {
    const currentIndex = getCurrentTrackIndex();
    if (currentIndex >= 0 && playlist.length > 0) {
      if (currentIndex < playlist.length - 1) {
        // Play next track
        const nextTrack = playlist[currentIndex + 1];
        selectTrack(nextTrack);
      } else {
        // Loop back to first track
        const firstTrack = playlist[0];
        selectTrack(firstTrack);
      }
    }
  };

  const playPreviousTrack = () => {
    const currentIndex = getCurrentTrackIndex();
    if (currentIndex > 0) {
      const prevTrack = playlist[currentIndex - 1];
      selectTrack(prevTrack);
    } else if (currentIndex === 0 && currentTime > 3) {
      // If less than 3 seconds, restart current track, otherwise go to previous
      setCurrentTime(0);
    } else if (currentIndex === 0) {
      // Restart current track if at the beginning
      setCurrentTime(0);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const seekTo = (time) => {
    setCurrentTime(time);
  };

  const setVolumeLevel = (level) => {
    setVolume(level);
  };

  const updateTime = (time) => {
    setCurrentTime(time);
  };

  const updateDuration = (dur) => {
    setDuration(dur);
  };

  const setPlaying = (playing) => {
    setIsPlaying(playing);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        playlist,
        selectTrack,
        togglePlayPause,
        seekTo,
        setVolumeLevel,
        updateTime,
        updateDuration,
        setPlaying,
        playNextTrack,
        playPreviousTrack,
        setPlaylist,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
