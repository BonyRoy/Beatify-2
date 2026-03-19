import React, { useState, useRef, useCallback, useEffect } from "react";
import { fetchMusicList } from "../services/musicService";
import { useAlbumArt } from "../context/AlbumArtContext";
import { usePlayer } from "../context/PlayerContext";
import "./FloatingButton.css";

const FEATURED_TRACK_UUID = "5ffeb49c-da15-4553-8450-68513e8b8a31";

const STORAGE_KEY = "beatify-floating-button-position";
const DRAG_THRESHOLD = 5;

const PlusIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const loadStoredPosition = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { x, y } = JSON.parse(stored);
      if (typeof x === "number" && typeof y === "number") return { x, y };
    }
  } catch (_) {}
  return null;
};

const savePosition = (x, y) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
  } catch (_) {}
};

const CloseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MusicPlaceholderIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const FloatingButton = ({
  onClick,
  children,
  ariaLabel = "Floating action",
}) => {
  const { getAlbumArt, fetchAlbumArt } = useAlbumArt();
  const { selectTrack } = usePlayer();
  const [position, setPosition] = useState(loadStoredPosition);
  const [showOverlay, setShowOverlay] = useState(false);
  const [featuredTrack, setFeaturedTrack] = useState(null);
  const [bannerError, setBannerError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);
  const lastPositionRef = useRef(null);

  const getDefaultPosition = useCallback(() => {
    const btnSize = 56;
    const margin = 20;
    return {
      x: window.innerWidth - btnSize - margin,
      y: window.innerHeight - btnSize - margin,
    };
  }, []);

  const clampPosition = useCallback((x, y) => {
    const btnSize = 56;
    const margin = 8;
    return {
      x: Math.max(margin, Math.min(window.innerWidth - btnSize - margin, x)),
      y: Math.max(margin, Math.min(window.innerHeight - btnSize - margin, y)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      const pos = position ?? getDefaultPosition();
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: pos.x,
        posY: pos.y,
      };
      hasMovedRef.current = false;
      setIsDragging(true);
    },
    [position, getDefaultPosition],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging) return;
      e.preventDefault?.();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      const { x: startX, y: startY, posX, posY } = dragStartRef.current;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMovedRef.current = true;
      }
      const clamped = clampPosition(posX + dx, posY + dy);
      lastPositionRef.current = clamped;
      setPosition(clamped);
    },
    [isDragging, clampPosition],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!hasMovedRef.current) {
      setShowOverlay(true);
      onClick?.();
    } else {
      const pos = lastPositionRef.current;
      if (pos) savePosition(pos.x, pos.y);
    }
  }, [isDragging, onClick]);

  useEffect(() => {
    const onResize = () => {
      if (position) {
        const clamped = clampPosition(position.x, position.y);
        if (clamped.x !== position.x || clamped.y !== position.y) {
          setPosition(clamped);
          savePosition(clamped.x, clamped.y);
        }
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, clampPosition]);

  useEffect(() => {
    if (!showOverlay) return;
    const onEscape = (e) => {
      if (e.key === "Escape") setShowOverlay(false);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [showOverlay]);

  useEffect(() => {
    if (!showOverlay) return;
    let cancelled = false;
    fetchMusicList()
      .then((tracks) => {
        if (cancelled) return;
        const track = tracks.find(
          (t) => (t.uuid || t.id) === FEATURED_TRACK_UUID,
        );
        setFeaturedTrack(track ?? null);
      })
      .catch(() => setFeaturedTrack(null));
    return () => {
      cancelled = true;
    };
  }, [showOverlay]);

  useEffect(() => {
    if (featuredTrack && !getAlbumArt(featuredTrack)) {
      fetchAlbumArt(featuredTrack);
    }
  }, [featuredTrack, getAlbumArt, fetchAlbumArt]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = (e) => handlePointerUp(e);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const pos = position ?? getDefaultPosition();

  return (
    <>
      {showOverlay && (
        <div
          className="floating-button-overlay"
          onClick={() => setShowOverlay(false)}
          role="dialog"
          aria-modal="true"
          aria-label="AI gradient overlay"
        >
          <div
            className="floating-button-overlay__content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="floating-button-overlay__header">
              <p className="floating-button-overlay__byline">brought to you by beatify</p>
              <h1 className="floating-button-overlay__brand">Kahaani Beats</h1>
              <p className="floating-button-overlay__tagline">There is Always a Story Behind a Great Song</p>
            </div>
            {bannerError ? null : (
              <img
                src="/story.png"
                alt="Story"
                className="floating-button-overlay__banner"
                onError={() => setBannerError(true)}
              />
            )}
            <div className="floating-button-overlay__story">
              <h2 className="floating-button-overlay__song-title">
                Itna na na mujh se tu pyar badha (Film: Chhaaya)
              </h2>
              <p className="floating-button-overlay__song-desc">
                Salil Chowdhury loved Mozart&apos;s music and wanted to use that
                classical style in this song. The producer wasn&apos;t sure at
                first, but Salil insisted it would work. The song was recorded
                with that symphony—and it became a timeless classic.
              </p>
            </div>
            {featuredTrack ? (
              <div
                className="floating-button-overlay__card"
                onClick={() => {
                  selectTrack(featuredTrack, [featuredTrack]);
                  setShowOverlay(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectTrack(featuredTrack, [featuredTrack]);
                    setShowOverlay(false);
                  }
                }}
                aria-label={`Play ${featuredTrack.name || "track"}`}
              >
                <div className="floating-button-overlay__card-art">
                  {getAlbumArt(featuredTrack) ? (
                    <img
                      src={getAlbumArt(featuredTrack)}
                      alt={`${featuredTrack.name} album art`}
                    />
                  ) : (
                    <div className="floating-button-overlay__card-placeholder">
                      <MusicPlaceholderIcon />
                    </div>
                  )}
                </div>
                <div className="floating-button-overlay__card-info">
                  <h3 className="floating-button-overlay__card-title">
                    {featuredTrack.name || "Unknown Track"}
                  </h3>
                  <p className="floating-button-overlay__card-artist">
                    {featuredTrack.artist || "Unknown Artist"}
                  </p>
                  {featuredTrack.album && (
                    <p className="floating-button-overlay__card-album">
                      {featuredTrack.album}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="floating-button-overlay__loading">Loading...</div>
            )}
          </div>
          <button
            className="floating-button-overlay__close"
            onClick={(e) => {
              e.stopPropagation();
              setShowOverlay(false);
            }}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      )}
      <button
        className={`floating-button ${isDragging ? "floating-button--dragging" : ""}`}
        style={{
          left: pos.x,
          top: pos.y,
          right: "auto",
          bottom: "auto",
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        aria-label={ariaLabel}
      >
        {children ?? <PlusIcon />}
      </button>
    </>
  );
};

export default FloatingButton;
