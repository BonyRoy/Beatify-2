import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UserPlus,
  User,
  MessageSquarePlus,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import EmptyFavoritesModal from "./EmptyFavoritesModal";
import { THEME_OPTIONS } from "../utils/themeOptions";
import "./Sidebar.css";

const FavoriteIcon = ({ filled }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SunIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonStarsIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    <path d="M15 5v1.5M18 8h1.5M16 11l1 1" strokeWidth="1.2" />
  </svg>
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

const PlaylistIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const TrackIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const ThemeToggle = ({ isDark, toggleTheme }) => (
  <button
    type="button"
    className={`sidebar__theme-toggle ${isDark ? "sidebar__theme-toggle--dark" : "sidebar__theme-toggle--light"}`}
    onClick={toggleTheme}
    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
  >
    <span className="sidebar__theme-toggle__track">
      <span className="sidebar__theme-toggle__icon sidebar__theme-toggle__icon--left">
        <SunIcon />
      </span>
      <span className="sidebar__theme-toggle__icon sidebar__theme-toggle__icon--right">
        <MoonStarsIcon />
      </span>
      <span className="sidebar__theme-toggle__knob" />
    </span>
  </button>
);

const ChartIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ERA_ORDER = [
  "40s",
  "50s",
  "60s",
  "70s",
  "80s",
  "90s",
  "2000s",
  "2010s",
  "2020s",
];

const Sidebar = ({
  isOpen,
  onClose,
  onOpenTopArtists,
  onOpenCreateAccount,
  onOpenProfileModal,
  onOpenRequestSong,
  onOpenFeedback,
  userName,
  userAvatar,
  notificationCount = 0,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [hasFavorites, setHasFavorites] = useState(false);
  const [showEmptyFavModal, setShowEmptyFavModal] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Read favorites from localStorage when sidebar opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("favorites");
        const list = saved ? JSON.parse(saved) : [];
        setHasFavorites(Array.isArray(list) && list.length > 0);
      } catch {
        setHasFavorites(false);
      }
    }
  }, [isOpen]);

  // Default to 'track' on mobile, 'playlist' on desktop if no view param is set
  const defaultView = isMobile ? "track" : "playlist";
  const currentView = searchParams.get("view") || defaultView;
  const showFavorites = searchParams.get("favorites") === "true";
  const selectedEra = searchParams.get("era") || "";
  const selectedTheme = searchParams.get("theme") || "";

  const handleEraClick = (era) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedEra === era) {
      newParams.delete("era");
    } else {
      newParams.set("era", era);
    }
    setSearchParams(newParams);
    onClose();
  };

  const handleThemeClick = (theme) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedTheme === theme) {
      newParams.delete("theme");
    } else {
      newParams.set("theme", theme);
    }
    setSearchParams(newParams);
    onClose();
  };

  const handleTrackOrPlaylist = () => {
    const nextView = currentView === "track" ? "playlist" : "track";
    navigate(`/?view=${nextView}`);
    onClose();
  };

  const handleToggleFavorites = () => {
    if (!hasFavorites) {
      setShowEmptyFavModal(true);
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    if (showFavorites) {
      newParams.delete("favorites");
    } else {
      newParams.set("favorites", "true");
      newParams.delete("playlist");
    }
    setSearchParams(newParams);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <EmptyFavoritesModal
        isOpen={showEmptyFavModal}
        onClose={() => setShowEmptyFavModal(false)}
      />
      <div
        className={`sidebar__overlay ${isOpen ? "sidebar__overlay--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <CloseIcon />
        </button>

        <div className="sidebar__content">
          {onOpenProfileModal ? (
            <button
              type="button"
              className="sidebar__profile sidebar__profile--clickable"
              onClick={onOpenProfileModal}
            >
              <div className="sidebar__profile-icon">
                {userAvatar ? (
                  <img
                    src={`/Avatars/${userAvatar}.png`}
                    alt="Profile"
                    className="sidebar__profile-avatar"
                  />
                ) : (
                  <User size={24} />
                )}
                {notificationCount > 0 && (
                  <span className="sidebar__notification-badge">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </div>
              <span className="sidebar__profile-label">
                {userName || "Signed in"}
              </span>
            </button>
          ) : onOpenCreateAccount ? (
            <button
              type="button"
              className="sidebar__item sidebar__item--button"
              onClick={onOpenCreateAccount}
            >
              <span className="sidebar__label">Create Account</span>
              <span className="sidebar__icon">
                <UserPlus size={20} />
              </span>
            </button>
          ) : null}

          <div
            className="sidebar__item"
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && toggleTheme()}
          >
            <span className="sidebar__label">Theme</span>
            <span onClick={(e) => e.stopPropagation()}>
              <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
            </span>
          </div>

          <button
            type="button"
            className={`sidebar__item sidebar__item--button ${showFavorites ? "sidebar__item--active" : ""} ${!hasFavorites ? "sidebar__item--disabled" : ""}`}
            onClick={handleToggleFavorites}
            aria-label={
              hasFavorites
                ? "Show my favorites"
                : "No favorites yet - click to see message"
            }
          >
            <span className="sidebar__label">My Favorites</span>
            <span className="sidebar__icon">
              <FavoriteIcon filled={showFavorites} />
            </span>
          </button>

          <div className="sidebar__era-section">
            <div className="sidebar__era-header">
              <span className="sidebar__era-label">
                {isMobile ? "Era" : "Moods"}
              </span>
              <span className="sidebar__icon">
                {isMobile ? (
                  <ClockIcon />
                ) : (
                  <Sparkles size={20} strokeWidth={1.8} aria-hidden />
                )}
              </span>
            </div>
            <div className="sidebar__era-badges">
              {ERA_ORDER.map((era) => (
                <button
                  key={era}
                  type="button"
                  className={`sidebar__era-badge sidebar__era-badge--${era.replace(/\s/g, "")} ${selectedEra === era ? "sidebar__era-badge--selected" : ""}`}
                  onClick={() => handleEraClick(era)}
                >
                  {era}
                </button>
              ))}
            </div>
            <div className="sidebar__era-themes">
              {THEME_OPTIONS.map((theme, idx) => {
                const isLong = theme.length > 20;
                const colorClass = `sidebar__era-theme-badge--c${idx % 10}`;
                return (
                  <button
                    key={theme}
                    type="button"
                    className={`sidebar__era-theme-badge ${colorClass} ${selectedTheme === theme ? "sidebar__era-theme-badge--selected" : ""} ${isLong ? "sidebar__era-theme-badge--scroll" : ""}`}
                    onClick={() => handleThemeClick(theme)}
                    title={theme}
                  >
                    <span className="sidebar__era-theme-badge-inner">
                      <span className="sidebar__era-theme-badge-text">
                        {theme}
                      </span>
                      {isLong && (
                        <span className="sidebar__era-theme-badge-text sidebar__era-theme-badge-text--duplicate">
                          {theme}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {onOpenTopArtists && (
            <button
              type="button"
              className="sidebar__item sidebar__item--button"
              onClick={() => {
                onOpenTopArtists();
              }}
            >
              <span className="sidebar__label">Top Artists</span>
              <span className="sidebar__icon">
                <ChartIcon />
              </span>
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              className={`sidebar__item sidebar__item--button ${currentView === "moods" ? "sidebar__item--active" : ""}`}
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set("view", "moods");
                setSearchParams(newParams);
                onClose();
              }}
            >
              <span className="sidebar__label">Moods</span>
              <span className="sidebar__icon">
                <Sparkles size={20} strokeWidth={1.8} aria-hidden />
              </span>
            </button>
          )}
          <button
            type="button"
            className={`sidebar__item sidebar__item--button ${currentView === "playlist" ? "sidebar__item--active" : ""}`}
            onClick={handleTrackOrPlaylist}
          >
            <span className="sidebar__label">
              {currentView === "track" ? "Playlist" : "Track"}
            </span>
            <span className="sidebar__icon">
              {currentView === "track" ? <PlaylistIcon /> : <TrackIcon />}
            </span>
          </button>

          {onOpenRequestSong && (
            <button
              type="button"
              className="sidebar__item sidebar__item--button"
              onClick={() => {
                onOpenRequestSong();
                onClose();
              }}
            >
              <span className="sidebar__label">Song Request</span>
              <span className="sidebar__icon">
                <MessageSquarePlus size={20} />
              </span>
            </button>
          )}

          {onOpenFeedback && (
            <button
              type="button"
              className="sidebar__item sidebar__item--button"
              onClick={() => {
                onOpenFeedback();
                onClose();
              }}
            >
              <span className="sidebar__label">Feedback</span>
              <span className="sidebar__icon">
                <MessageSquare size={20} />
              </span>
            </button>
          )}
        </div>

        <div className="sidebar__footer">
          <p className="sidebar__version">v2.0.0</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
