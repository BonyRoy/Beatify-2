import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Pencil, Trash2 } from "lucide-react";
import { fuzzyMatches } from "../utils/searchUtils";
import { usePlaylist } from "../context/PlaylistContext";
import { deleteUserPlaylistById } from "../utils/userPlaylistsStorage";
import CreatePlaylistModal from "./CreatePlaylistModal";
import { useUserPlaylistCoverUrl } from "../hooks/useUserPlaylistCoverUrl";
import "./DownloadModal.css";
import "./Playlist.css";

const RESERVED_PLAYLIST_NAMES = ["My Favorites", "Top 10 of the Week"];

/** Hidden from the horizontal playlist strip on phone; Top 10 is shown in MobileTopTracksSection instead */
const TOP_10_PLAYLIST_LABEL = "Top 10 of the Week";

const PlaylistIconGradient = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="playlist__icon-gradient"
  >
    <defs>
      <linearGradient id="playlist-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect
      x="3"
      y="5"
      width="5"
      height="3"
      rx="0.5"
      fill="url(#playlist-gradient)"
    />
    <rect
      x="3"
      y="11"
      width="5"
      height="3"
      rx="0.5"
      fill="url(#playlist-gradient)"
    />
    <rect
      x="3"
      y="17"
      width="5"
      height="3"
      rx="0.5"
      fill="url(#playlist-gradient)"
    />
    <line
      x1="11"
      y1="6.5"
      x2="20"
      y2="6.5"
      stroke="url(#playlist-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="11"
      y1="12.5"
      x2="20"
      y2="12.5"
      stroke="url(#playlist-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="11"
      y1="18.5"
      x2="20"
      y2="18.5"
      stroke="url(#playlist-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const FavoriteHeartIcon = ({ className = "" }) => (
  <svg
    className={`playlist__favorites-heart ${className}`}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const PlaylistMusicPlaceholder = () => (
  <div className="playlist__placeholder" aria-hidden="true">
    <svg
      className="playlist__placeholder-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255, 255, 255, 0.9)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  </div>
);

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

const DeletePlaylistConfirmModal = ({ target, onClose, onConfirm }) => {
  if (!target) return null;
  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="modal playlist-delete-modal"
        role="alertdialog"
        aria-labelledby="playlist-delete-title"
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
        <div className="modal__content">
          <h3 id="playlist-delete-title" className="modal__title">
            Delete playlist?
          </h3>
          <p className="playlist-delete-modal__text">
            &quot;{target.label}&quot; will be removed from this device. This
            cannot be undone.
          </p>
          <div className="playlist-delete-modal__actions">
            <button
              type="button"
              className="modal__btn playlist-delete-modal__btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal__btn playlist-delete-modal__btn-delete"
              onClick={onConfirm}
            >
              <Trash2 size={18} aria-hidden />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const PlaylistImageItem = ({
  playlist,
  isSelected,
  onClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  const userCoverUrl = useUserPlaylistCoverUrl(
    playlist.isUserPlaylist ? playlist.id : null,
  );
  const isUser = playlist.isUserPlaylist === true;
  const noArt = isUser && !userCoverUrl;
  const showDelete = isUser && playlist.id;

  const handleLoad = () => setLoaded(true);
  const handleError = (e) => {
    if (!triedFallback) {
      setTriedFallback(true);
      e.target.src = `/playlistbg/${playlist.image || "thar.png"}`;
    }
  };

  return (
    <div
      className={`playlist__item ${isSelected ? "playlist__item--selected" : ""}`}
      onClick={() => onClick(playlist.label)}
    >
      <div
        className={`playlist__image-wrapper ${noArt ? "playlist__image-wrapper--no-art" : ""}`}
      >
        {showDelete && (
          <div className="playlist__user-actions">
            <button
              type="button"
              className="playlist__edit-btn"
              aria-label={`Edit playlist ${playlist.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(playlist);
              }}
            >
              <Pencil size={16} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="playlist__delete-btn"
              aria-label={`Delete playlist ${playlist.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick({ id: playlist.id, label: playlist.label });
              }}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
        <PlaylistMusicPlaceholder />
        {isUser && userCoverUrl && (
          <img
            src={userCoverUrl}
            alt=""
            className="playlist__image playlist__image--loaded"
          />
        )}
        {!isUser && (
          <img
            src={`/playlistbg/${playlist.image || "thar.png"}`}
            alt={playlist.label}
            className={`playlist__image ${loaded ? "playlist__image--loaded" : ""}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        <div className="playlist__label">{playlist.label}</div>
      </div>
    </div>
  );
};

const FAVORITES_LABEL = "My Favorites";

const Playlist = ({ hasFavorites = false }) => {
  const { playlistImages, refreshPlaylists, getPlaylistByLabel } =
    usePlaylist();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get("search") || "";
  const selectedPlaylist = searchParams.get("playlist") || "";
  const showFavorites = searchParams.get("favorites") === "true";
  const [isMobile, setIsMobile] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const reservedNamesForModal = useMemo(() => {
    const labels = playlistImages.map((p) => p.label);
    const all = [...RESERVED_PLAYLIST_NAMES, ...labels];
    if (editingPlaylist) {
      return all.filter((n) => n !== editingPlaylist.name);
    }
    return all;
  }, [playlistImages, editingPlaylist]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter playlists based on search query (fuzzy match, ~75% similarity)
  const filteredPlaylists = useMemo(() => {
    let list = !searchQuery
      ? playlistImages
      : playlistImages.filter((playlist) =>
          fuzzyMatches(searchQuery, playlist.label),
        );
    if (isMobile) {
      list = list.filter((p) => p.label !== TOP_10_PLAYLIST_LABEL);
    }
    return list;
  }, [searchQuery, playlistImages, isMobile]);

  // Include My Favorites card only when user has favorites, and when search matches or no search
  const showFavoritesCard =
    hasFavorites &&
    (!searchQuery || fuzzyMatches(searchQuery, FAVORITES_LABEL));

  // On mobile: if in playlist view, search is active, but no playlists match - switch to track view so user sees track results
  const view = searchParams.get("view") || (isMobile ? "track" : "playlist");
  useEffect(() => {
    if (
      isMobile &&
      searchQuery.trim() &&
      view === "playlist" &&
      filteredPlaylists.length === 0
    ) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("view", "track");
      setSearchParams(newParams);
    }
  }, [
    isMobile,
    searchQuery,
    view,
    filteredPlaylists.length,
    searchParams,
    setSearchParams,
  ]);

  const handleFavoritesClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (showFavorites) {
      newSearchParams.delete("favorites");
    } else {
      newSearchParams.set("favorites", "true");
      newSearchParams.delete("playlist");
    }
    if (isMobile) {
      newSearchParams.set("view", "track");
      navigate(`/?${newSearchParams.toString()}`);
    } else {
      setSearchParams(newSearchParams);
    }
  };

  const handlePlaylistClick = (playlistLabel) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedPlaylist === playlistLabel) {
      // Deselect if clicking the same playlist
      newSearchParams.delete("playlist");
    } else {
      // Select the new playlist
      newSearchParams.set("playlist", playlistLabel);
      // Remove artist and favorites filters when selecting a playlist
      newSearchParams.delete("artist");
      newSearchParams.delete("favorites");
    }

    // On mobile, navigate to tracks view after selecting playlist
    if (isMobile && selectedPlaylist !== playlistLabel) {
      newSearchParams.set("view", "track");
      navigate(`/?${newSearchParams.toString()}`);
    } else {
      setSearchParams(newSearchParams);
    }
  };

  const handleConfirmDeleteUserPlaylist = () => {
    if (!deleteConfirm?.id) {
      setDeleteConfirm(null);
      return;
    }
    const removed = deleteUserPlaylistById(deleteConfirm.id);
    if (removed) {
      toast.success(`Playlist "${deleteConfirm.label}" deleted.`);
      if (selectedPlaylist === deleteConfirm.label) {
        const next = new URLSearchParams(searchParams);
        next.delete("playlist");
        if (isMobile) {
          next.set("view", "track");
          navigate(`/?${next.toString()}`);
        } else {
          setSearchParams(next);
        }
      }
    } else {
      toast.error("Could not delete playlist.");
    }
    setDeleteConfirm(null);
  };

  const handleClosePlaylistModal = () => {
    setCreatePlaylistOpen(false);
    setEditingPlaylist(null);
  };

  const handleEditUserPlaylist = (playlist) => {
    const full = getPlaylistByLabel(playlist.label);
    if (!full?.id || !full.isUserPlaylist) return;
    setEditingPlaylist({
      id: full.id,
      name: full.name,
      trackIds: Array.isArray(full.trackIds) ? [...full.trackIds] : [],
    });
    setCreatePlaylistOpen(true);
  };

  const handlePlaylistRenamed = (oldName, newName) => {
    if (selectedPlaylist !== oldName) return;
    const next = new URLSearchParams(searchParams);
    next.set("playlist", newName);
    if (isMobile) {
      navigate(`/?${next.toString()}`);
    } else {
      setSearchParams(next);
    }
  };

  return (
    <div className="playlist">
      <DeletePlaylistConfirmModal
        target={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDeleteUserPlaylist}
      />
      <CreatePlaylistModal
        isOpen={createPlaylistOpen}
        onClose={handleClosePlaylistModal}
        reservedNames={reservedNamesForModal}
        editPlaylist={editingPlaylist}
        onPlaylistRenamed={handlePlaylistRenamed}
      />
      <div className="playlist__header playlist__header--with-action">
        <h4 className="playlist__title">
          <PlaylistIconGradient />
          Playlist
        </h4>
        <button
          type="button"
          className="playlist__create-btn"
          onClick={() => {
            setEditingPlaylist(null);
            setCreatePlaylistOpen(true);
          }}
        >
          Create playlist
        </button>
      </div>
      <div className="playlist__grid">
        {!showFavoritesCard && filteredPlaylists.length === 0 ? (
          <div className="playlist__empty">
            <p>
              {searchQuery
                ? `No playlists found matching "${searchQuery}"`
                : "No playlists yet."}
            </p>
            {!searchQuery && (
              <>
                <p className="playlist__empty-hint">
                  Create your own with &quot;Create playlist&quot;, or an admin
                  can add playlists in Admin → Playlist.
                </p>
                {/* <button
                  type="button"
                  className="playlist__retry-btn"
                  onClick={() => refreshPlaylists()}
                >
                  Retry loading
                </button> */}
              </>
            )}
          </div>
        ) : (
          <>
            {showFavoritesCard && (
              <div
                className={`playlist__item playlist__item--favorites ${showFavorites ? "playlist__item--selected" : ""}`}
                onClick={handleFavoritesClick}
              >
                <div className="playlist__image-wrapper playlist__image-wrapper--favorites">
                  <FavoriteHeartIcon />
                  <div className="playlist__label">{FAVORITES_LABEL}</div>
                </div>
              </div>
            )}
            {filteredPlaylists.map((playlist) => (
              <PlaylistImageItem
                key={playlist.id || playlist.label}
                playlist={playlist}
                isSelected={selectedPlaylist === playlist.label}
                onClick={handlePlaylistClick}
                onEditClick={handleEditUserPlaylist}
                onDeleteClick={setDeleteConfirm}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Playlist;
