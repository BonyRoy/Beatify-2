import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";

/**
 * Records artist play when the current track changes.
 * Mount this inside both PlayerProvider and ListeningHistoryProvider.
 */
const ListeningHistoryTracker = () => {
  const { currentTrack } = usePlayer();
  const { recordArtistPlay } = useListeningHistory();
  const prevTrackIdRef = useRef(null);

  useEffect(() => {
    const trackId = currentTrack?.uuid || currentTrack?.id;
    if (!currentTrack?.artist || trackId === prevTrackIdRef.current) return;
    prevTrackIdRef.current = trackId;
    recordArtistPlay(currentTrack.artist);
  }, [currentTrack, recordArtistPlay]);

  return null;
};

export default ListeningHistoryTracker;
