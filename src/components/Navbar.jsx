import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { UserPlus, User, MessageSquare, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";
import { useCreateAccount } from "../context/CreateAccountContext";
import { useRequestSong } from "../context/RequestSongContext";
import { useFeedback } from "../context/FeedbackContext";
import { useNotifications } from "../context/NotificationsContext";
import Sidebar from "./Sidebar";
import Artists from "./Artists";
import TopArtistsModal from "./TopArtistsModal";
import ProfileModal from "./ProfileModal";
import LogoutModal from "./LogoutModal";
import EmptyFavoritesModal from "./EmptyFavoritesModal";
import NotificationsModal from "./NotificationsModal";
import { getStoredAvatar, setStoredAvatar } from "./ProfileModal";
import { getAccountById } from "../services/accountService";
import { usePlaylist } from "../context/PlaylistContext";
import { useUserPlaylistCoverUrl } from "../hooks/useUserPlaylistCoverUrl";
import { fuzzyMatches } from "../utils/searchUtils";
import {
  isGuestModUnlocked,
  unlockGuestMod,
  lockGuestMod,
} from "../utils/guestPlayLimit";
import { allArtists } from "../data/topArtists";
import "./Navbar.css";

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

const HamburgerIcon = ({ open }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {open ? (
      <>
        <path d="M18 6L6 18M6 6l12 12" />
      </>
    ) : (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    )}
  </svg>
);

const ThemeToggle = ({ isDark, toggleTheme }) => (
  <button
    type="button"
    className={`theme-toggle ${isDark ? "theme-toggle--dark" : "theme-toggle--light"}`}
    onClick={toggleTheme}
    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
  >
    <span className="theme-toggle__track">
      <span className="theme-toggle__icon theme-toggle__icon--left">
        <SunIcon />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--right">
        <MoonStarsIcon />
      </span>
      <span className="theme-toggle__knob" />
    </span>
  </button>
);

const FavoriteIcon = ({ filled }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ChartIcon = () => (
  <svg
    width="24"
    height="24"
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

const MusicIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="navbar__music-icon"
  >
    <defs>
      <linearGradient id="navbar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path
      d="M9 18V5l12-2v13"
      stroke="url(#navbar-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="6"
      cy="18"
      r="3"
      stroke="url(#navbar-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="18"
      cy="16"
      r="3"
      stroke="url(#navbar-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ClearIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const MobilePlaylistHeaderStrip = ({ selectedPlaylist, playlistImages }) => {
  const plMeta = useMemo(
    () => playlistImages.find((p) => p.label === selectedPlaylist),
    [playlistImages, selectedPlaylist],
  );
  const userCoverUrl = useUserPlaylistCoverUrl(
    plMeta?.isUserPlaylist ? plMeta.id : null,
  );
  const coverUrl = useMemo(() => {
    if (!plMeta) return "/playlistbg/thar.png";
    if (plMeta.isUserPlaylist) return userCoverUrl;
    return `/playlistbg/${plMeta.image?.trim() || "thar.png"}`;
  }, [plMeta, userCoverUrl]);

  return (
    <div
      className={`playlist-header-mobile ${coverUrl ? "" : "playlist-header-mobile--no-art"}`}
      style={
        coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined
      }
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={selectedPlaylist}
          className="playlist-header-mobile__image"
          onError={(e) => {
            const fallback = playlistImages.find(
              (p) => p.label === selectedPlaylist,
            );
            if (fallback?.isUserPlaylist) {
              e.target.removeAttribute("src");
              e.target.parentElement.classList.add(
                "playlist-header-mobile--no-art",
              );
              e.target.parentElement.style.backgroundImage = "";
              return;
            }
            const fallbackSrc = fallback
              ? `/playlistbg/${fallback.image || "thar.png"}`
              : "/playlistbg/thar.png";
            e.target.src = fallbackSrc;
            e.target.parentElement.style.backgroundImage = `url(${fallbackSrc})`;
          }}
        />
      ) : null}
      <div className="playlist-header-mobile__label">{selectedPlaylist}</div>
    </div>
  );
};

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { playlistImages } = usePlaylist();
  const {
    openCreateAccount,
    isLoggedIn,
    userName,
    userEmail,
    accountId,
    logout,
  } = useCreateAccount();
  const { openRequestSong } = useRequestSong();
  const { openFeedback } = useFeedback();
  const {
    unreadCount,
    notifications,
    markAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();
  const { getTopArtists } = useListeningHistory();
  const [menuOpen, setMenuOpen] = useState(false);
  const [topArtistsModalOpen, setTopArtistsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [emptyFavModalOpen, setEmptyFavModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState(() => getStoredAvatar());
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const showFavorites = searchParams.get("favorites") === "true";
  const selectedArtist = searchParams.get("artist");
  const selectedPlaylist = searchParams.get("playlist") || "";
  const view = searchParams.get("view") || "playlist";
  const searchQuery = searchParams.get("search") || "";
  const brandModTapCountRef = useRef(0);
  const brandModResetTimerRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* Measured navbar height — avoids a visible gap between nav and fixed artists / headers */
  useLayoutEffect(() => {
    const nav = document.querySelector(".navbar");
    if (!nav) return undefined;

    const apply = () => {
      const h = Math.round(nav.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--navbar-stack-height",
        `${h}px`,
      );
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(nav);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (brandModResetTimerRef.current) {
        clearTimeout(brandModResetTimerRef.current);
      }
    };
  }, []);

  // Sync avatar from Firebase when logged in (for cross-device persistence)
  useEffect(() => {
    if (isLoggedIn && accountId) {
      getAccountById(accountId)
        .then((account) => {
          const fbAvatar = account?.avatarId?.trim() || null;
          if (fbAvatar) {
            setStoredAvatar(fbAvatar);
            setUserAvatar(fbAvatar);
          }
        })
        .catch(() => {});
    }
  }, [isLoggedIn, accountId]);

  const showPlaylistHeader = isMobile && selectedPlaylist && view === "track";
  const showMoodsView = isMobile && view === "moods";

  useEffect(() => {
    if (showPlaylistHeader) {
      document.body.classList.add("playlist-header-visible");
    } else {
      document.body.classList.remove("playlist-header-visible");
    }
    return () => document.body.classList.remove("playlist-header-visible");
  }, [showPlaylistHeader]);

  useEffect(() => {
    if (showMoodsView) {
      document.body.classList.add("moods-header-visible");
    } else {
      document.body.classList.remove("moods-header-visible");
    }
    return () => document.body.classList.remove("moods-header-visible");
  }, [showMoodsView]);

  // Remove artist filter on page reload
  useEffect(() => {
    const currentArtist = searchParams.get("artist");
    if (currentArtist) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("artist");
      setSearchParams(newSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only on mount

  const handleSearchChange = (e) => {
    const newSearchParams = new URLSearchParams(searchParams);
    const value = e.target.value;
    if (value.trim()) {
      newSearchParams.set("search", value);
      if (isMobile) {
        const matchesPlaylist = playlistImages.some((p) =>
          fuzzyMatches(value.trim(), p.label),
        );
        if (matchesPlaylist) {
          newSearchParams.set("view", "playlist");
        }
      }
    } else {
      newSearchParams.delete("search");
    }
    setSearchParams(newSearchParams);
  };

  const handleClearSearch = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("search");
    setSearchParams(newSearchParams);
  };

  const handleBrandClick = (e) => {
    if (isMobile) {
      e.preventDefault();
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("view", view === "track" ? "playlist" : "track");
      setSearchParams(newSearchParams);
    }

    if (isLoggedIn) return;

    if (brandModResetTimerRef.current) {
      clearTimeout(brandModResetTimerRef.current);
      brandModResetTimerRef.current = null;
    }
    brandModTapCountRef.current += 1;
    if (brandModTapCountRef.current >= 10) {
      brandModTapCountRef.current = 0;
      if (isGuestModUnlocked()) {
        lockGuestMod();
        toast.info(
          <div>
            <div>MOD off — guest limits are back.</div>
            <div>Tap Beatify ×10 to unlock again.</div>
          </div>,
        );
      } else {
        unlockGuestMod();
        toast.success(
          <div>
            <div>MOD unlocked — unlimited listening.</div>
            <div>Keep it on the down-low.</div>
          </div>,
        );
      }
    } else {
      brandModResetTimerRef.current = setTimeout(() => {
        brandModTapCountRef.current = 0;
        brandModResetTimerRef.current = null;
      }, 4500);
    }
  };

  const checkHasFavorites = () => {
    try {
      const saved = localStorage.getItem("favorites");
      const list = saved ? JSON.parse(saved) : [];
      return Array.isArray(list) && list.length > 0;
    } catch {
      return false;
    }
  };

  const toggleFavorites = () => {
    if (!showFavorites && !checkHasFavorites()) {
      setEmptyFavModalOpen(true);
      return;
    }
    const newSearchParams = new URLSearchParams(searchParams);
    if (showFavorites) {
      newSearchParams.delete("favorites");
    } else {
      newSearchParams.set("favorites", "true");
      newSearchParams.delete("playlist");
    }
    setSearchParams(newSearchParams);
  };

  const handleArtistClick = (artistName) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedArtist === artistName) {
      // If clicking the same artist, deselect it
      newSearchParams.delete("artist");
    } else {
      // Select the new artist
      newSearchParams.set("artist", artistName);
      // Remove favorites and playlist filters when selecting an artist
      newSearchParams.delete("favorites");
      newSearchParams.delete("playlist");

      // On mobile, when on playlist view, switch to tracks to show artist's songs
      if (isMobile && view === "playlist") {
        newSearchParams.set("view", "track");
      }

      // Save to localStorage - remember first 4 selected artists
      const savedArtists = JSON.parse(
        localStorage.getItem("selectedArtists") || "[]",
      );
      // Remove if already exists (to avoid duplicates)
      const filtered = savedArtists.filter((name) => name !== artistName);
      // Add to beginning and keep only first 4
      const updated = [artistName, ...filtered].slice(0, 4);
      localStorage.setItem("selectedArtists", JSON.stringify(updated));
    }
    setSearchParams(newSearchParams);
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar__brand" onClick={handleBrandClick}>
          <MusicIcon />
          Beatify
        </Link>

        {/* Search field - visible on all screens */}
        <div className="navbar__search">
          <SearchIcon />
          <input
            type="text"
            className="navbar__search-input"
            placeholder="What do you want here?"
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search tracks and artists"
          />
          {searchQuery ? (
            <button
              type="button"
              className="navbar__search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>

        {/* Desktop: top artists, favorites, feedback, theme toggle, avatar (rightmost) */}
        <div className="navbar__desktop">
          <button
            type="button"
            className="navbar__top-artists-btn"
            onClick={() => setTopArtistsModalOpen(true)}
            aria-label="View your top artists"
          >
            <ChartIcon />
          </button>
          <button
            type="button"
            className={`navbar__favorites-btn ${showFavorites ? "navbar__favorites-btn--active" : ""}`}
            onClick={toggleFavorites}
            aria-label={
              showFavorites ? "Show all tracks" : "Show my favorites only"
            }
          >
            <FavoriteIcon filled={showFavorites} />
          </button>
          <button
            type="button"
            className="navbar__feedback-btn"
            onClick={openFeedback}
            aria-label="Send feedback"
            title="Send feedback"
          >
            <MessageSquare size={24} />
          </button>
          <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          {isLoggedIn ? (
            <button
              type="button"
              className="navbar__create-account-btn navbar__profile-btn navbar__profile-btn--with-badge"
              onClick={() => setProfileModalOpen(true)}
              aria-label="Profile"
              title="Profile"
            >
              {userAvatar ? (
                <img
                  src={`/Avatars/${userAvatar}.png`}
                  alt="Profile"
                  className="navbar__profile-avatar"
                />
              ) : (
                <User size={24} />
              )}
              {unreadCount > 0 && (
                <span className="navbar__notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="navbar__create-account-btn"
              onClick={openCreateAccount}
              aria-label="Create account"
              title="Create account"
            >
              <UserPlus size={24} />
            </button>
          )}
        </div>

        {/* Mobile: profile icon when logged in, hamburger when not */}
        <button
          type="button"
          className={`navbar__hamburger ${isLoggedIn ? "navbar__hamburger--profile" : ""} ${isLoggedIn && userAvatar ? "navbar__hamburger--avatar" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={
            menuOpen
              ? "Close menu"
              : isLoggedIn
                ? "Profile / Menu"
                : "Open menu"
          }
          aria-expanded={menuOpen}
        >
          {isLoggedIn ? (
            <>
              {userAvatar ? (
                <img
                  src={`/Avatars/${userAvatar}.png`}
                  alt="Profile"
                  className="navbar__hamburger-avatar"
                />
              ) : (
                <User size={24} />
              )}
              {unreadCount > 0 && (
                <span className="navbar__notification-badge navbar__notification-badge--hamburger">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </>
          ) : (
            <HamburgerIcon open={menuOpen} />
          )}
        </button>

        <Sidebar
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          onOpenTopArtists={() => {
            setMenuOpen(false);
            setTopArtistsModalOpen(true);
          }}
          onOpenRequestSong={() => {
            setMenuOpen(false);
            openRequestSong();
          }}
          onOpenFeedback={() => {
            setMenuOpen(false);
            openFeedback();
          }}
          onOpenCreateAccount={
            isLoggedIn
              ? undefined
              : () => {
                  setMenuOpen(false);
                  openCreateAccount();
                }
          }
          onOpenProfileModal={
            isLoggedIn
              ? () => {
                  setMenuOpen(false);
                  setProfileModalOpen(true);
                }
              : undefined
          }
          userName={userName}
          userAvatar={userAvatar}
          notificationCount={unreadCount}
        />
        <TopArtistsModal
          isOpen={topArtistsModalOpen}
          onClose={() => setTopArtistsModalOpen(false)}
          topArtists={getTopArtists(3)}
          allArtists={allArtists}
        />
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setUserAvatar(getStoredAvatar());
          }}
          onOpenLogout={() => {
            setProfileModalOpen(false);
            setLogoutModalOpen(true);
          }}
          onOpenNotifications={() => {
            setProfileModalOpen(false);
            setNotificationsModalOpen(true);
          }}
          onAvatarChange={setUserAvatar}
          userName={userName}
          userEmail={userEmail}
          accountId={accountId}
          notificationCount={unreadCount}
        />
        <NotificationsModal
          isOpen={notificationsModalOpen}
          onClose={() => setNotificationsModalOpen(false)}
          notifications={notifications}
          onMarkRead={markAsRead}
          onRemove={removeNotification}
          onClearAll={clearAll}
        />
        <LogoutModal
          isOpen={logoutModalOpen}
          onClose={() => setLogoutModalOpen(false)}
          onLogout={logout}
        />
        <EmptyFavoritesModal
          isOpen={emptyFavModalOpen}
          onClose={() => setEmptyFavModalOpen(false)}
        />
      </nav>
      {isMobile && view === "moods" ? (
        <div className="moods-header-mobile">
          <Sparkles
            size={22}
            strokeWidth={2}
            className="moods-header-mobile__icon"
            aria-hidden
          />
          <span className="moods-header-mobile__label">Moods</span>
        </div>
      ) : isMobile && selectedPlaylist && view === "track" ? (
        <MobilePlaylistHeaderStrip
          selectedPlaylist={selectedPlaylist}
          playlistImages={playlistImages}
        />
      ) : isMobile && view === "playlist" ? null : (
        <Artists
          artists={allArtists}
          selectedArtist={selectedArtist}
          searchQuery={searchQuery}
          onArtistClick={handleArtistClick}
        />
      )}
    </>
  );
};

export default Navbar;
