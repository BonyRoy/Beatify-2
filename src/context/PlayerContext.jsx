import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useListeningHistory } from "./ListeningHistoryContext";
import { useCreateAccount } from "./CreateAccountContext";
import {
  checkGuestCanPlay,
  addGuestPlay,
  GUEST_PLAYS_MAX,
} from "../utils/guestPlayLimit";

const PlayerContext = createContext();
const SESSION_PLAYED_KEY = "beatify_session_played";
const SESSION_PLAYED_MAX = 100;

const getSessionPlayedArray = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_PLAYED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const getSessionPlayedIds = () => new Set(getSessionPlayedArray());

const addToSessionPlayed = (id) => {
  if (!id) return;
  const sid = String(id).trim();
  if (!sid) return;
  try {
    const arr = getSessionPlayedArray();
    if (arr.some((x) => String(x) === sid)) return;
    arr.push(sid);
    if (arr.length > SESSION_PLAYED_MAX) {
      arr.shift();
    }
    sessionStorage.setItem(SESSION_PLAYED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to save session played:", e);
  }
};

const clearSessionPlayed = () => {
  try {
    sessionStorage.removeItem(SESSION_PLAYED_KEY);
  } catch {}
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider = ({ children }) => {
  const { recordArtistPlay, recordTrackPlay } = useListeningHistory();
  const { isLoggedIn } = useCreateAccount();

  // Clear session-played list on app load/reload
  useEffect(() => {
    clearSessionPlayed();
  }, []);

  // Show toast when guest limit renews (on app load if data was > 24h old)
  useEffect(() => {
    if (isLoggedIn) return;
    const { renewed } = checkGuestCanPlay();
    if (renewed) {
      toast.info(
        `Your daily listening limit has been renewed! Listen to ${GUEST_PLAYS_MAX} more songs.`
      );
    }
  }, [isLoggedIn]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playlist, setPlaylist] = useState([]);
  const [fullMusicList, setFullMusicList] = useState([]);

  const selectTrack = (track, tracksList = null) => {
    // Same track already playing: don't reload, don't update, don't count
    const currentId = currentTrack?.uuid || currentTrack?.id;
    const trackId = track?.uuid || track?.id;
    if (track && currentId && trackId && currentId === trackId) {
      return;
    }

    // Guest limit: 4 songs per day for non-logged-in users
    if (!isLoggedIn && track) {
      const { canPlay, renewed } = checkGuestCanPlay();
      if (renewed) {
        toast.info(
          `Your daily listening limit has been renewed! Listen to ${GUEST_PLAYS_MAX} more songs.`
        );
      }
      if (!canPlay) {
        toast.warning(
          `You've reached your daily limit of ${GUEST_PLAYS_MAX} songs. Sign in for unlimited listening!`
        );
        return;
      }
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    // Count immediately on click (before audio loads)
    if (track) {
      if (track.artist) recordArtistPlay(track.artist);
      recordTrackPlay(track);
      const tid = track.uuid ?? track.id;
      if (tid) addToSessionPlayed(String(tid));
      if (!isLoggedIn && tid) addGuestPlay(String(tid));
      // Play count is incremented in Footer after 30 sec of playback
    }
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
    const sessionArr = getSessionPlayedArray();
    const sessionPlayed = new Set(sessionArr.map((x) => String(x)));
    const isInSessionPlayed = (t) => {
      const uid = t?.uuid != null ? String(t.uuid) : null;
      const iid = t?.id != null ? String(t.id) : null;
      return (uid && sessionPlayed.has(uid)) || (iid && sessionPlayed.has(iid));
    };

    const currentIndex = getCurrentTrackIndex();
    let candidates;
    if (currentIndex >= 0 && playlist.length > 0) {
      const afterCurrent = playlist.slice(currentIndex + 1);
      candidates = afterCurrent.length > 0 ? afterCurrent : playlist;
    } else {
      candidates = fullMusicList.length > 0 ? fullMusicList : playlist;
    }
    if (candidates.length === 0) return;

    // Only pick tracks NOT in beatify_session_played
    let notPlayed = candidates.filter((t) => !isInSessionPlayed(t));
    let nextTrack;
    if (notPlayed.length > 0) {
      nextTrack = notPlayed[0];
    } else {
      // Recommendations exhausted: randomly pick from full catalog, excluding session played
      const pool = fullMusicList.length > 0 ? fullMusicList : candidates;
      const notInSession = pool.filter((t) => !isInSessionPlayed(t));
      if (notInSession.length > 0) {
        nextTrack = notInSession[Math.floor(Math.random() * notInSession.length)];
      } else {
        // Entire catalog in session: pick oldest from session
        for (const oldId of sessionArr) {
          const oldStr = String(oldId);
          const t = pool.find(
            (c) =>
              String(c?.uuid ?? "") === oldStr || String(c?.id ?? "") === oldStr,
          );
          if (t) {
            nextTrack = t;
            break;
          }
        }
        if (!nextTrack) nextTrack = pool[0];
      }
    }

    if (nextTrack) selectTrack(nextTrack);
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
        setFullMusicList,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
