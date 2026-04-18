import React, { useState, useRef, useCallback, useEffect } from "react";
import { fetchMusicList } from "../services/musicService";
import { fetchFeaturedStory } from "../services/featuredStoryService";
import { submitUserStory } from "../services/userStorySubmissionsService";
import { useAlbumArt } from "../context/AlbumArtContext";
import { usePlayer } from "../context/PlayerContext";
import { useCreateAccount } from "../context/CreateAccountContext";
import "./FloatingButton.css";

const STORAGE_KEY = "beatify-floating-button-position";
const DRAG_THRESHOLD = 5;
const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_START_TOP_ZONE = 150; /* only close when swipe starts in top area */

const StoryBookIcon = () => (
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
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const loadStoredPosition = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { x, y } = JSON.parse(stored);
      if (typeof x === "number" && typeof y === "number") {
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
          const btnSize = 56;
          const margin = 20;
          const reserveRight = 96;
          if (x > window.innerWidth - btnSize - margin - reserveRight) {
            return { x: margin, y };
          }
        }
        return { x, y };
      }
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

const ChevronDownIcon = () => (
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
    <polyline points="6 9 12 15 18 9" />
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
  const { isLoggedIn, accountId, userName, userEmail } = useCreateAccount();
  const [position, setPosition] = useState(loadStoredPosition);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isClosingOverlay, setIsClosingOverlay] = useState(false);
  const [overlayEntered, setOverlayEntered] = useState(false);
  const [storyConfig, setStoryConfig] = useState(null);
  const [featuredTrack, setFeaturedTrack] = useState(null);
  const [bannerError, setBannerError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyFormTitle, setStoryFormTitle] = useState("");
  const [storyFormStory, setStoryFormStory] = useState("");
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [storySubmitSuccess, setStorySubmitSuccess] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);
  const lastPositionRef = useRef(null);
  const swipeStartRef = useRef(null);

  const getDefaultPosition = useCallback(() => {
    const btnSize = 56;
    const margin = 20;
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return {
        x: margin,
        y: window.innerHeight - btnSize - margin,
      };
    }
    return {
      x: window.innerWidth - btnSize - margin,
      y: window.innerHeight - btnSize - margin,
    };
  }, []);

  const clampPosition = useCallback((x, y) => {
    const btnSize = 56;
    const margin = 8;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const narrow = w <= 768;
    const reserveRight = 96;
    const maxX = narrow
      ? Math.max(margin, w - btnSize - margin - reserveRight)
      : w - btnSize - margin;
    return {
      x: Math.max(margin, Math.min(maxX, x)),
      y: Math.max(margin, Math.min(h - btnSize - margin, y)),
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

  const handleCloseOverlay = useCallback(() => {
    if (isClosingOverlay) return;
    setIsClosingOverlay(true);
  }, [isClosingOverlay]);

  useEffect(() => {
    if (!showOverlay) return;
    const onEscape = (e) => {
      if (e.key === "Escape") handleCloseOverlay();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [showOverlay, handleCloseOverlay]);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedStory()
      .then((config) => {
        if (cancelled) return;
        setStoryConfig(config);
      })
      .catch(() => setStoryConfig(null));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showOverlay || !storyConfig) return;
    let cancelled = false;
    const uuid = storyConfig.featuredTrackUuid;
    fetchMusicList()
      .then((tracks) => {
        if (cancelled) return;
        const track = tracks.find(
          (t) => (t.uuid || t.id) === uuid,
        );
        setFeaturedTrack(track ?? null);
      })
      .catch(() => setFeaturedTrack(null));
    return () => {
      cancelled = true;
    };
  }, [showOverlay, storyConfig]);

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

  const handleOverlayTouchStart = useCallback((e) => {
    const y = e.touches?.[0]?.clientY;
    if (y != null && y < SWIPE_START_TOP_ZONE) {
      swipeStartRef.current = y;
    } else {
      swipeStartRef.current = null;
    }
  }, []);

  const handleOverlayTransitionEnd = useCallback(
    (e) => {
      if (e.propertyName === "transform" && isClosingOverlay) {
        setShowOverlay(false);
      }
    },
    [isClosingOverlay],
  );

  const handleOverlayTouchEnd = useCallback(
    (e) => {
      const startY = swipeStartRef.current;
      if (startY == null) return;
      swipeStartRef.current = null;
      const endY = e.changedTouches?.[0]?.clientY ?? 0;
      const deltaY = endY - startY;
      if (deltaY > SWIPE_CLOSE_THRESHOLD) {
        handleCloseOverlay();
      }
    },
    [handleCloseOverlay],
  );

  useEffect(() => {
    if (!showOverlay) {
      setIsClosingOverlay(false);
      setOverlayEntered(false);
    }
  }, [showOverlay]);

  useEffect(() => {
    if (showOverlay && !isClosingOverlay) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOverlayEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [showOverlay, isClosingOverlay]);

  if (storyConfig === null) {
    return null;
  }

  return (
    <>
      {showOverlay && (
        <div
          className={`floating-button-overlay ${overlayEntered && !isClosingOverlay ? "floating-button-overlay--open" : ""} ${isClosingOverlay ? "floating-button-overlay--closing" : ""}`}
          onClick={handleCloseOverlay}
          onTouchStart={handleOverlayTouchStart}
          onTouchEnd={handleOverlayTouchEnd}
          onTransitionEnd={handleOverlayTransitionEnd}
          role="dialog"
          aria-modal="true"
          aria-label="AI gradient overlay"
        >
          <div
            className="floating-button-overlay__content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="floating-button-overlay__header">
              <p className="floating-button-overlay__byline">
                {storyConfig.byline}
              </p>
              <h1 className="floating-button-overlay__brand">
                {storyConfig.brand}
              </h1>
              <p className="floating-button-overlay__tagline">
                {storyConfig.tagline}
              </p>
            </div>
            {bannerError || !storyConfig.bannerImageUrl ? null : (
              <img
                src={storyConfig.bannerImageUrl}
                alt="Story"
                className="floating-button-overlay__banner"
                onError={() => setBannerError(true)}
              />
            )}
            <div className="floating-button-overlay__story">
              <h2 className="floating-button-overlay__song-title">
                {storyConfig.songTitle}
              </h2>
              <p className="floating-button-overlay__song-desc">
                {storyConfig.songDescription}
              </p>
            </div>
            {featuredTrack ? (
              <div
                className="floating-button-overlay__card"
                onClick={() => {
                  selectTrack(featuredTrack, [featuredTrack]);
                  handleCloseOverlay();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectTrack(featuredTrack, [featuredTrack]);
                    handleCloseOverlay();
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
            {isLoggedIn && (
              <div className="floating-button-overlay__submit-story">
                <button
                  type="button"
                  className="floating-button-overlay__submit-story-btn"
                  onClick={() => setShowStoryForm(true)}
                >
                  Submit a story if you have any, if we find it interesting we
                  will share here
                </button>
              </div>
            )}
          </div>
          {showStoryForm && (
            <div
              className="floating-button-overlay__form-backdrop"
              onClick={() => {
                if (!storySubmitting) {
                  setShowStoryForm(false);
                  setStoryFormTitle("");
                  setStoryFormStory("");
                  setStorySubmitSuccess(false);
                }
              }}
            >
              <div
                className="floating-button-overlay__form-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="floating-button-overlay__form-header">
                  <h3>Submit Your Story</h3>
                  <button
                    type="button"
                    className="floating-button-overlay__form-close"
                    onClick={() => {
                      if (!storySubmitting) {
                        setShowStoryForm(false);
                        setStoryFormTitle("");
                        setStoryFormStory("");
                        setStorySubmitSuccess(false);
                      }
                    }}
                    aria-label="Close"
                  >
                    <CloseIcon />
                  </button>
                </div>
                {storySubmitSuccess ? (
                  <div className="floating-button-overlay__form-success">
                    <p>Thank you! Your story has been submitted. We&apos;ll
                      review it and share it here if we find it interesting.</p>
                  </div>
                ) : (
                  <form
                    className="floating-button-overlay__form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const title = storyFormTitle.trim();
                      const story = storyFormStory.trim();
                      if (!title || !story) return;
                      setStorySubmitting(true);
                      try {
                        await submitUserStory({
                          title,
                          story,
                          accountId,
                          userName,
                          userEmail,
                        });
                        setStorySubmitSuccess(true);
                        setStoryFormTitle("");
                        setStoryFormStory("");
                      } catch (err) {
                        console.error("Failed to submit story:", err);
                      } finally {
                        setStorySubmitting(false);
                      }
                    }}
                  >
                    <div className="floating-button-overlay__form-group">
                      <label htmlFor="story-title">Title</label>
                      <input
                        id="story-title"
                        type="text"
                        value={storyFormTitle}
                        onChange={(e) => setStoryFormTitle(e.target.value)}
                        placeholder="Story title"
                        required
                        disabled={storySubmitting}
                        className="floating-button-overlay__form-input"
                      />
                    </div>
                    <div className="floating-button-overlay__form-group">
                      <label htmlFor="story-content">Story</label>
                      <textarea
                        id="story-content"
                        value={storyFormStory}
                        onChange={(e) => setStoryFormStory(e.target.value)}
                        placeholder="Share your story..."
                        required
                        disabled={storySubmitting}
                        rows={5}
                        className="floating-button-overlay__form-input"
                      />
                    </div>
                    <button
                      type="submit"
                      className="floating-button-overlay__form-submit"
                      disabled={storySubmitting}
                    >
                      {storySubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
          <button
            className="floating-button-overlay__close"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseOverlay();
            }}
            aria-label="Close"
          >
            <ChevronDownIcon />
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
        {children ?? <StoryBookIcon />}
      </button>
    </>
  );
};

export default FloatingButton;
