import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { extractCoverDataUrlFromBlob } from "../utils/extractCoverFromMediaFile";

const AlbumArtContext = createContext();

export const useAlbumArt = () => {
  const ctx = useContext(AlbumArtContext);
  if (!ctx) throw new Error("useAlbumArt must be used within AlbumArtProvider");
  return ctx;
};

const getFetchUrl = (url) => {
  if (
    typeof window === "undefined" ||
    !url?.startsWith("https://firebasestorage.googleapis.com/")
  )
    return url;
  if (window.location.hostname === "localhost")
    return "/storage-proxy" + url.slice("https://firebasestorage.googleapis.com".length);
  return "/api/storage-proxy?url=" + encodeURIComponent(url);
};

/** First ~768 KiB covers almost all ID3v2 + embedded pictures without full file download */
const COVER_RANGE_BYTES = 786432;

function looksLikeVideoPath(url) {
  const pathOnly = (url || "").split("?")[0] || "";
  return /\.(mp4|webm|m4v|mov)(\?|$)/i.test(pathOnly);
}

/**
 * Fetch only the start of the file (Range) when the server supports it.
 * Falls back to full GET when Range is unsupported or fails.
 */
async function fetchBlobChunkForCover(fetchUrl) {
  try {
    const res = await fetch(fetchUrl, {
      headers: { Range: `bytes=0-${COVER_RANGE_BYTES - 1}` },
      mode: "cors",
      credentials: "omit",
    });
    if (res.status === 206) {
      return await res.blob();
    }
    if (res.status === 200) {
      const blob = await res.blob();
      if (blob.size <= COVER_RANGE_BYTES) return blob;
      return blob.slice(0, COVER_RANGE_BYTES);
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function fetchFullBlob(fetchUrl) {
  const response = await fetch(fetchUrl, { mode: "cors", credentials: "omit" });
  if (!response.ok) return null;
  return response.blob();
}

const extractFromUrl = async (url) => {
  const fetchUrl = getFetchUrl(url);

  if (!looksLikeVideoPath(url)) {
    const chunk = await fetchBlobChunkForCover(fetchUrl);
    if (chunk && chunk.size > 0) {
      const fromPartial = await extractCoverDataUrlFromBlob(chunk, url);
      if (fromPartial) return fromPartial;
    }
  }

  const blob = await fetchFullBlob(fetchUrl);
  if (!blob) return null;
  return extractCoverDataUrlFromBlob(blob, url);
};

export const AlbumArtProvider = ({ children }) => {
  const [cache, setCache] = useState({});
  const cacheRef = useRef({});
  const inProgressRef = useRef(new Set());

  cacheRef.current = cache;

  const fetchAlbumArt = useCallback(async (track) => {
    const url = track?.fileUrl || track?.url;
    if (!url) return null;

    const hasStored =
      track?.coverUrl || track?.artworkUrl || track?.albumArtUrl;
    if (hasStored) return null;

    if (cacheRef.current[url]) return cacheRef.current[url];
    if (inProgressRef.current.has(url)) return null;

    inProgressRef.current.add(url);
    try {
      const dataUrl = await extractFromUrl(url);
      if (dataUrl) {
        setCache((c) => ({ ...c, [url]: dataUrl }));
        return dataUrl;
      }
    } catch {
      // ignore
    } finally {
      inProgressRef.current.delete(url);
    }
    return null;
  }, []);

  const getAlbumArt = useCallback((track) => {
    const stored = track?.coverUrl || track?.artworkUrl || track?.albumArtUrl;
    if (stored) return stored;
    const url = track?.fileUrl || track?.url;
    return url ? cache[url] : null;
  }, [cache]);

  return (
    <AlbumArtContext.Provider value={{ getAlbumArt, fetchAlbumArt, cache }}>
      {children}
    </AlbumArtContext.Provider>
  );
};
