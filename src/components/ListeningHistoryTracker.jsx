import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";

/**
 * Records artist play and last 10 songs when the current track changes.
 * Mount this inside both PlayerProvider and ListeningHistoryProvider.
 */
const ListeningHistoryTracker = () => {
  const { currentTrack } = usePlayer();
  const { recordArtistPlay, recordTrackPlay } = useListeningHistory();
  const prevTrackIdRef = useRef(null);

  useEffect(() => {
    const trackId = currentTrack?.uuid || currentTrack?.id;
    if (!currentTrack || trackId === prevTrackIdRef.current) return;
    prevTrackIdRef.current = trackId;
    if (currentTrack.artist) {
      recordArtistPlay(currentTrack.artist);
    }
    recordTrackPlay(currentTrack);
  }, [currentTrack, recordArtistPlay, recordTrackPlay]);

  return null;
};

export default ListeningHistoryTracker;
