import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { fetchMusicList } from "../services/musicService";
import { fuzzyMatchesAny } from "../utils/searchUtils";
import { addUserPlaylist } from "../utils/userPlaylistsStorage";
import {
  saveUserPlaylistCoverBlob,
  compressImageFileForPlaylistCover,
} from "../utils/userPlaylistCoverIdb";
import { X } from "lucide-react";
import { useAlbumArt } from "../context/AlbumArtContext";
import "./DownloadModal.css";
import "./CreatePlaylistModal.css";


const getTrackId = (track) => String(track?.uuid ?? track?.id ?? "");

const getDurationSec = (track) => {
  const d = track?.duration;
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const n = parseFloat(String(d).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const getUploadedAtMs = (track) => {
  const ts = track?.uploadedAt;
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  if (typeof ts === "number") return ts;
  return 0;
};

const SORT_OPTIONS = [
  { value: "title_az", label: "Title A–Z" },
  { value: "title_za", label: "Title Z–A" },
  { value: "artist_az", label: "Artist A–Z" },
  { value: "artist_za", label: "Artist Z–A" },
  { value: "newest", label: "Newest uploads" },
  { value: "oldest", label: "Oldest uploads" },
  { value: "duration_short", label: "Duration (shortest)" },
  { value: "duration_long", label: "Duration (longest)" },
];

const RowMusicIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

function CreatePlaylistSongRow({ track, selected, onToggle }) {
  const { getAlbumArt, fetchAlbumArt } = useAlbumArt();
  const rowRef = useRef(null);
  const albumArtUrl = getAlbumArt(track);

  useEffect(() => {
    if (albumArtUrl || !track?.fileUrl) return;
    const el = rowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchAlbumArt(track);
      },
      { rootMargin: "80px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [track, albumArtUrl, fetchAlbumArt]);

  return (
    <li ref={rowRef}>
      <button
        type="button"
        className={`create-playlist-modal__song ${selected ? "create-playlist-modal__song--selected" : ""}`}
        onClick={() => onToggle(track)}
      >
        <span className="create-playlist-modal__song-art">
          {albumArtUrl ? (
            <img
              src={albumArtUrl}
              alt=""
              className="create-playlist-modal__song-art-img"
            />
          ) : (
            <span className="create-playlist-modal__song-art-placeholder">
              <RowMusicIcon />
            </span>
          )}
        </span>
        <span className="create-playlist-modal__song-body">
          <span className="create-playlist-modal__song-title">
            {track.name || "Untitled"}
          </span>
          <span className="create-playlist-modal__song-meta">
            {track.artist || "—"}
          </span>
        </span>
      </button>
    </li>
  );
}

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CreatePlaylistModal = ({
  isOpen,
  onClose,
  reservedNames = [],
}) => {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("title_az");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const coverInputRef = useRef(null);

  const reservedLower = useMemo(
    () => new Set(reservedNames.map((n) => String(n).trim().toLowerCase())),
    [reservedNames],
  );

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setSearch("");
    setSort("title_az");
    setSelectedOrder([]);
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLoading(true);
    fetchMusicList()
      .then(setTracks)
      .catch((e) => {
        console.error(e);
        toast.error("Could not load songs.");
        setTracks([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const sortedTracks = useMemo(() => {
    const list = [...tracks];
    const title = (t) => String(t?.name || "").toLowerCase();
    const artist = (t) => String(t?.artist || "").toLowerCase();
    switch (sort) {
      case "title_az":
        return list.sort((a, b) => title(a).localeCompare(title(b)));
      case "title_za":
        return list.sort((a, b) => title(b).localeCompare(title(a)));
      case "artist_az":
        return list.sort((a, b) => artist(a).localeCompare(artist(b)));
      case "artist_za":
        return list.sort((a, b) => artist(b).localeCompare(artist(a)));
      case "newest":
        return list.sort((a, b) => getUploadedAtMs(b) - getUploadedAtMs(a));
      case "oldest":
        return list.sort((a, b) => getUploadedAtMs(a) - getUploadedAtMs(b));
      case "duration_short":
        return list.sort((a, b) => getDurationSec(a) - getDurationSec(b));
      case "duration_long":
        return list.sort((a, b) => getDurationSec(b) - getDurationSec(a));
      default:
        return list;
    }
  }, [tracks, sort]);

  const filteredTracks = useMemo(() => {
    if (!search.trim()) return sortedTracks;
    return sortedTracks.filter((track) =>
      fuzzyMatchesAny(
        search,
        track.name,
        track.artist,
        track.album,
        track.genre,
      ),
    );
  }, [sortedTracks, search]);

  const selectedSet = useMemo(
    () => new Set(selectedOrder),
    [selectedOrder],
  );

  const toggleTrack = useCallback((track) => {
    const id = getTrackId(track);
    if (!id) return;
    setSelectedOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleCoverChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setCoverFile(f);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a playlist name.");
      return;
    }
    if (reservedLower.has(trimmed.toLowerCase())) {
      toast.error("That playlist name is already taken.");
      return;
    }
    if (selectedOrder.length === 0) {
      toast.error("Select at least one song.");
      return;
    }
    setSubmitting(true);
    try {
      const playlistId = addUserPlaylist({
        name: trimmed,
        trackIds: selectedOrder,
      });
      if (coverFile) {
        try {
          const blob = await compressImageFileForPlaylistCover(coverFile);
          await saveUserPlaylistCoverBlob(playlistId, blob);
        } catch (imgErr) {
          console.warn(imgErr);
          toast.warning(
            "Playlist saved, but the cover image could not be processed.",
          );
        }
      }
      toast.success(`Playlist "${trimmed}" saved.`);
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not save playlist.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="modal create-playlist-modal"
        role="dialog"
        aria-labelledby="create-playlist-title"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal__close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <div className="modal__content create-playlist-modal__content">
          <h2 id="create-playlist-title" className="modal__title">
            Create playlist
          </h2>
          <form onSubmit={handleSubmit} className="create-playlist-form">
            <label className="create-playlist-form__label" htmlFor="pl-name">
              Playlist name
            </label>
            <input
              id="pl-name"
              type="text"
              className="create-playlist-form__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My playlist"
              autoComplete="off"
              maxLength={120}
            />

            <div className="create-playlist-form__cover">
              <span className="create-playlist-form__label">
                Cover image{" "}
                <span className="create-playlist-form__optional">(optional)</span>
              </span>
              <div className="create-playlist-form__cover-row">
                <div className="create-playlist-form__cover-preview-col">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="create-playlist-form__cover-input"
                    id="pl-cover"
                    onChange={handleCoverChange}
                    aria-label="Choose playlist cover image"
                  />
                  <div className="create-playlist-form__cover-preview-wrap">
                    <label
                      htmlFor="pl-cover"
                      className="create-playlist-form__cover-drop"
                    >
                      <div
                        className={`create-playlist-form__cover-preview ${coverPreviewUrl ? "create-playlist-form__cover-preview--has-image" : ""}`}
                      >
                        {coverPreviewUrl ? (
                          <img
                            src={coverPreviewUrl}
                            alt=""
                            className="create-playlist-form__cover-preview-img"
                          />
                        ) : (
                          <span className="create-playlist-form__cover-default">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                    {coverPreviewUrl && (
                      <button
                        type="button"
                        className="create-playlist-form__cover-clear"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearCover();
                        }}
                        aria-label="Remove cover image"
                      >
                        <X size={12} strokeWidth={2.5} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                <div className="create-playlist-form__cover-aside">
                  <p className="create-playlist-form__cover-hint">
                    Tap the image to choose from your device. Leave as default if
                    you prefer.
                  </p>
                </div>
              </div>
            </div>

            <div className="create-playlist-form__row">
              <div className="create-playlist-form__grow">
                <label
                  className="create-playlist-form__label"
                  htmlFor="pl-search"
                >
                  Search songs
                </label>
                <input
                  id="pl-search"
                  type="search"
                  className="create-playlist-form__input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, artist, album…"
                  autoComplete="off"
                />
              </div>
              <div className="create-playlist-form__sort">
                <label
                  className="create-playlist-form__label"
                  htmlFor="pl-sort"
                >
                  Sort
                </label>
                <select
                  id="pl-sort"
                  className="create-playlist-form__select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="create-playlist-form__hint">
              Tap songs to select. Order in your playlist follows the order you
              pick them ({selectedOrder.length} selected).
            </p>

            <div className="create-playlist-modal__list-wrap">
              {loading ? (
                <p className="create-playlist-modal__status">Loading songs…</p>
              ) : filteredTracks.length === 0 ? (
                <p className="create-playlist-modal__status">
                  No songs match your search.
                </p>
              ) : (
                <ul className="create-playlist-modal__list">
                  {filteredTracks.map((track) => {
                    const id = getTrackId(track);
                    const selected = selectedSet.has(id);
                    return (
                      <CreatePlaylistSongRow
                        key={id || track.name}
                        track={track}
                        selected={selected}
                        onToggle={toggleTrack}
                      />
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="create-playlist-modal__actions">
              <button
                type="button"
                className="create-playlist-modal__btn create-playlist-modal__btn--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="create-playlist-modal__btn create-playlist-modal__btn--primary"
                disabled={submitting || loading}
              >
                {submitting ? "Saving…" : "Save playlist"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreatePlaylistModal;
