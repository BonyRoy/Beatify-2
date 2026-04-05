import { useState, useEffect } from "react";
import {
  getUserPlaylistCoverBlob,
  USER_PLAYLIST_COVER_CHANGED,
} from "../utils/userPlaylistCoverIdb";

/**
 * Object URL for a user playlist cover from IndexedDB, or null.
 */
export function useUserPlaylistCoverUrl(playlistId) {
  const [url, setUrl] = useState(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const bump = () => setRev((r) => r + 1);
    window.addEventListener(USER_PLAYLIST_COVER_CHANGED, bump);
    return () => window.removeEventListener(USER_PLAYLIST_COVER_CHANGED, bump);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!playlistId) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    (async () => {
      const blob = await getUserPlaylistCoverBlob(playlistId);
      if (cancelled) return;
      if (!blob) {
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        return;
      }
      const next = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(next);
        return;
      }
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return next;
      });
    })();

    return () => {
      cancelled = true;
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [playlistId, rev]);

  return url;
}
