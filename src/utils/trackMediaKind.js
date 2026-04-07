/**
 * Upload + playback helpers: browsers report different MIME types for the same
 * file (e.g. video/quicktime for .mov; empty type on some OS). We match by
 * type prefix and extension.
 */

const VIDEO_EXT_RE =
  /\.(mp4|m4v|mov|webm|mkv|ogv|3gp|3g2|avi|wmv|flv)(\?|#|$)/i;

export function isAllowedMusicUploadFile(file) {
  if (!file) return false;
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("audio/")) return true;
  if (t.startsWith("video/")) return true;
  if (t === "application/mp4") return true;
  return VIDEO_EXT_RE.test(file.name || "");
}

/** Use `<video>` for these containers (audio-only UX; `<audio>` often fails). */
export function trackUsesVideoPlayback(track) {
  if (!track) return false;
  const name = (track.originalFileName || track.fileName || "").toLowerCase();
  if (VIDEO_EXT_RE.test(name)) return true;
  const url = (track.fileUrl || track.url || "").toLowerCase();
  return VIDEO_EXT_RE.test(url);
}

/** For cover extraction: video containers often have no embedded covr — only a video track. */
export function blobLooksLikeVideoContainer(blob, urlHint) {
  if (!blob) return false;
  const t = (blob.type || "").toLowerCase();
  if (t.startsWith("video/") || t === "application/mp4") return true;
  if (typeof File !== "undefined" && blob instanceof File) {
    if (VIDEO_EXT_RE.test(blob.name || "")) return true;
  }
  if (urlHint && VIDEO_EXT_RE.test(String(urlHint).toLowerCase())) return true;
  return false;
}

const EXT_FROM_NAME_OR_URL = /\.([a-z0-9]+)(?:\?|#|$)/i;

/** Lowercase extension from original filename or storage URL. */
function extensionFromTrack(track) {
  if (!track) return "";
  const paths = [
    track.originalFileName,
    track.fileName,
    track.fileUrl,
    track.url,
  ].filter(Boolean);
  for (const p of paths) {
    const m = String(p).match(EXT_FROM_NAME_OR_URL);
    if (m) return m[1].toLowerCase();
  }
  return "";
}

/**
 * UI badge: "MP3" or "MP4" from stored filename/URL. Other formats → null.
 * @returns {"MP3" | "MP4" | null}
 */
export function getTrackFormatTag(track) {
  const ext = extensionFromTrack(track);
  if (!ext) return null;
  if (ext === "mp3") return "MP3";
  if (
    [
      "mp4",
      "m4v",
      "mov",
      "webm",
      "mkv",
      "ogv",
      "3gp",
      "3g2",
      "avi",
      "wmv",
      "flv",
      "m4a",
      "m4b",
      "f4a",
      "f4b",
    ].includes(ext)
  ) {
    return "MP4";
  }
  return null;
}
