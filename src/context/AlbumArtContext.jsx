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
  if (typeof window === "undefined" || !url?.startsWith("https://firebasestorage.googleapis.com/"))
    return url;
  if (window.location.hostname === "localhost")
    return "/storage-proxy" + url.slice("https://firebasestorage.googleapis.com".length);
  return "/api/storage-proxy?url=" + encodeURIComponent(url);
};

const extractFromUrl = async (url) => {
  const fetchUrl = getFetchUrl(url);
  const response = await fetch(fetchUrl);
  if (!response.ok) return null;
  const blob = await response.blob();
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
