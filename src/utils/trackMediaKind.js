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
