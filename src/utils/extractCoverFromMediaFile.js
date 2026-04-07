import { parseBlob, selectCover } from "music-metadata";
import { blobLooksLikeVideoContainer } from "./trackMediaKind";

const VIDEO_FRAME_LOAD_MS = 22000;
const VIDEO_FRAME_SEEK_MS = 12000;
const THUMB_MAX_PX = 512;

/** Dynamic-only: static import of jsmediatags breaks some browser bundles (fs/buffer). */
async function readWithJsMediaTags(fileOrBlob, callbacks) {
  try {
    const mod = await import("jsmediatags/build2/jsmediatags.js");
    const api = mod?.default ?? mod;
    const read = api?.read ?? api?.default?.read;
    if (typeof read !== "function") {
      callbacks.onError(new Error("jsmediatags read unavailable"));
      return;
    }
    read(fileOrBlob, callbacks);
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
  }
}

function mimeFromJsMediaTagsFormat(format) {
  if (!format) return "image/jpeg";
  const f = String(format).toLowerCase();
  if (f.startsWith("image/")) return format;
  if (f === "jpeg" || f === "jpg") return "image/jpeg";
  if (f === "png") return "image/png";
  return `image/${f}`;
}

function coverFromMusicMetadata(metadata) {
  if (!metadata?.common?.picture?.length) return null;
  const cover = selectCover(metadata.common.picture);
  if (!cover?.data) return null;
  const mime = cover.format || "image/jpeg";
  const ext = mime === "image/png" ? "png" : "jpg";
  const blob = new Blob([cover.data], { type: mime });
  return { blob, ext, mime };
}

function bytesToCoverResult(data, formatHint) {
  if (!data) return null;
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!bytes.length) return null;
  const mime = mimeFromJsMediaTagsFormat(formatHint);
  const ext = mime === "image/png" ? "png" : "jpg";
  const blob = new Blob([bytes], { type: mime });
  return { blob, ext, mime };
}

function coverFromJsMediaTags(tag) {
  const pic = tag?.tags?.picture;
  if (!pic) return null;
  if (pic.data) return bytesToCoverResult(pic.data, pic.format);
  if (Array.isArray(pic) && pic[0]?.data) {
    return bytesToCoverResult(pic[0].data, pic[0].format);
  }
  return null;
}

/**
 * Many MP4/music files have no covr atom — grab first decoded frame as artwork (browser-only).
 * @param {Blob} blob
 * @returns {Promise<{ blob: Blob, ext: string, mime: string } | null>}
 */
async function extractVideoFrameThumbnail(blob) {
  if (typeof document === "undefined") return null;

  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  const waitEvent = (el, ev, ms) =>
    new Promise((resolve, reject) => {
      const t = window.setTimeout(() => {
        el.removeEventListener(ev, onOk);
        el.removeEventListener("error", onErr);
        reject(new Error(`${ev} timeout`));
      }, ms);
      const onOk = () => {
        window.clearTimeout(t);
        el.removeEventListener(ev, onOk);
        el.removeEventListener("error", onErr);
        resolve();
      };
      const onErr = () => {
        window.clearTimeout(t);
        el.removeEventListener(ev, onOk);
        el.removeEventListener("error", onErr);
        reject(new Error("video error"));
      };
      el.addEventListener(ev, onOk, { once: true });
      el.addEventListener("error", onErr, { once: true });
    });

  try {
    video.src = objectUrl;
    await waitEvent(video, "loadeddata", VIDEO_FRAME_LOAD_MS);

    if (!video.videoWidth || !video.videoHeight) {
      try {
        await video.play();
        video.pause();
      } catch {
        /* ignore */
      }
      if (!video.videoWidth || !video.videoHeight) return null;
    }

    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    const seekTime = dur > 0 ? Math.min(1, Math.max(0.05, dur * 0.02)) : 0.1;
    video.currentTime = seekTime;
    await waitEvent(video, "seeked", VIDEO_FRAME_SEEK_MS);

    let w = video.videoWidth;
    let h = video.videoHeight;
    if (!w || !h) return null;
    if (w > THUMB_MAX_PX || h > THUMB_MAX_PX) {
      const s = THUMB_MAX_PX / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);

    const outBlob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
    });
    if (!outBlob || outBlob.size === 0) return null;
    return { blob: outBlob, ext: "jpg", mime: "image/jpeg" };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Embedded cover art: tries music-metadata first, then jsmediatags (better MP4/covr edge cases).
 * @param {Blob | File} fileOrBlob
 * @param {{ sourceUrl?: string }} [options] - Storage URL helps when blob.type is wrong/missing.
 * @returns {Promise<{ blob: Blob, ext: string, mime: string } | null>}
 */
export async function extractCoverFromMediaFile(fileOrBlob, options = {}) {
  const sourceUrl = options.sourceUrl;
  try {
    const metadata = await parseBlob(fileOrBlob);
    const fromMm = coverFromMusicMetadata(metadata);
    if (fromMm) return fromMm;
  } catch {
    /* try jsmediatags */
  }

  try {
    const tag = await new Promise((resolve, reject) => {
      readWithJsMediaTags(fileOrBlob, {
        onSuccess: resolve,
        onError: (e) => reject(e instanceof Error ? e : new Error(String(e))),
      }).catch(reject);
    });
    const fromTags = coverFromJsMediaTags(tag);
    if (fromTags) return fromTags;
  } catch {
    /* try video frame */
  }

  if (blobLooksLikeVideoContainer(fileOrBlob, sourceUrl)) {
    const fromFrame = await extractVideoFrameThumbnail(fileOrBlob);
    if (fromFrame) return fromFrame;
  }

  return null;
}

/**
 * Data URL for in-memory cache (AlbumArtContext) when no stored coverUrl.
 * @param {Blob} blob
 * @param {string} [sourceUrl] - Original file URL (extension) when blob has no useful MIME type.
 * @returns {Promise<string | null>}
 */
export async function extractCoverDataUrlFromBlob(blob, sourceUrl) {
  try {
    const result = await extractCoverFromMediaFile(blob, { sourceUrl });
    if (!result) return null;
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () =>
        resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(result.blob);
    });
  } catch {
    return null;
  }
}
