import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DownloadModal from "../components/DownloadModal";
import { useRequestSong } from "../context/RequestSongContext";
import { useFeedback } from "../context/FeedbackContext";
import {
  dispatchFavoritesChanged,
  FAVORITES_LOADED,
} from "../components/ListeningStatsSync";
import Playlist from "../components/Playlist";
import { fetchMusicList } from "../services/musicService";
import { usePlayer } from "../context/PlayerContext";
import { useAlbumArt } from "../context/AlbumArtContext";
import { useTrackPlayCounts } from "../context/TrackPlayCountsContext";
import { useCreateAccount } from "../context/CreateAccountContext";
import { useListeningHistory } from "../context/ListeningHistoryContext";
import { usePlaylist } from "../context/PlaylistContext";
import { fuzzyMatchesAny } from "../utils/searchUtils";
import { sortTracksByRelevance } from "../utils/trackRelevanceUtils";
import { THEME_OPTIONS } from "../utils/themeOptions";
import { MOODS_IMAGES } from "../utils/moodsImages";
import "./Home.css";

const DownloadIcon = ({ filled }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FavoriteIcon = ({ filled }) => (
  <svg
    width="16"
    height="16"
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

const MusicIcon = () => (
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
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const MusicIconGradient = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="home__music-icon-gradient"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="tracks-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path d="M9 18V5l12-2v13" stroke="url(#tracks-gradient)" />
    <circle cx="6" cy="18" r="3" stroke="url(#tracks-gradient)" />
    <circle cx="18" cy="16" r="3" stroke="url(#tracks-gradient)" />
  </svg>
);

const MoodsIconGradient = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="home__era-icon-gradient"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="moods-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path
      d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
      stroke="url(#moods-gradient)"
    />
    <path d="M20 2v4" stroke="url(#moods-gradient)" />
    <path d="M22 4h-4" stroke="url(#moods-gradient)" />
    <circle cx="4" cy="20" r="2" stroke="url(#moods-gradient)" />
  </svg>
);

// Extract year from releaseDate (handles "2020", "2020-01-15", "2020-01", etc.)
const getYearFromReleaseDate = (releaseDate) => {
  if (!releaseDate) return null;
  const str = String(releaseDate).trim();
  const year = parseInt(str.slice(0, 4), 10);
  return !isNaN(year) && year >= 1900 && year <= 2100 ? year : null;
};

// Map year to era label
const getEraFromYear = (year) => {
  if (!year) return null;
  if (year >= 1970 && year <= 1979) return "70s";
  if (year >= 1980 && year <= 1989) return "80s";
  if (year >= 1990 && year <= 1999) return "90s";
  if (year >= 2000 && year <= 2009) return "2000s";
  if (year >= 2010 && year <= 2019) return "2010s";
  if (year >= 2020 && year <= 2029) return "2020s";
  return null;
};

// Era (years) display order
const ERA_ORDER = ["70s", "80s", "90s", "2000s", "2010s", "2020s"];

const MusicTrack = ({
  track,
  onDownloadClick,
  onFavoriteToggle,
  onTrackClick,
  favorites,
  downloads,
  isSelected,
  isPlaying = false,
}) => {
  const { getAlbumArt, fetchAlbumArt } = useAlbumArt();
  const { getPlayCount } = useTrackPlayCounts();
  const trackRowRef = useRef(null);

  // Use UUID if available, otherwise fall back to track ID (matching reference implementation)
  const trackIdentifier = track.uuid || track.id;
  const isFavorite = favorites.includes(trackIdentifier);
  const isDownloaded = downloads.includes(trackIdentifier);

  // Refs for overflow detection
  const titleRef = useRef(null);
  const artistRef = useRef(null);
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false);
  const [shouldScrollArtist, setShouldScrollArtist] = useState(false);
  const [titleDuration, setTitleDuration] = useState(20);
  const [artistDuration, setArtistDuration] = useState(20);

  // Get album art - stored URL or cached extracted
  const albumArtUrl = getAlbumArt(track);

  // Lazy load embedded album art when track scrolls into view
  useEffect(() => {
    if (albumArtUrl || !track.fileUrl) return;

    const el = trackRowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchAlbumArt(track);
        }
      },
      { rootMargin: "100px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [track, albumArtUrl, fetchAlbumArt]);

  // Constant scrolling speed in pixels per second
  const SCROLL_SPEED = 15; // pixels per second

  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (titleRef.current) {
            const titleEl = titleRef.current;
            const wrapperEl = titleEl.closest(".track-row__title-wrapper");
            const innerEl = titleEl.closest(".track-row__title-inner");
            if (wrapperEl && innerEl) {
              const isOverflowing =
                titleEl.scrollWidth > wrapperEl.offsetWidth + 5;
              setShouldScrollTitle(isOverflowing);

              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth;
                const distance = totalWidth / 2; // Animation moves -50%
                const duration = distance / SCROLL_SPEED;
                setTitleDuration(Math.max(duration, 10)); // Minimum 10 seconds
              }
            }
          }
          if (artistRef.current) {
            const artistEl = artistRef.current;
            const wrapperEl = artistEl.closest(".track-row__artist-wrapper");
            const innerEl = artistEl.closest(".track-row__artist-inner");
            if (wrapperEl && innerEl) {
              const isOverflowing =
                artistEl.scrollWidth > wrapperEl.offsetWidth + 5;
              setShouldScrollArtist(isOverflowing);

              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth;
                const distance = totalWidth / 2; // Animation moves -50%
                const duration = distance / SCROLL_SPEED;
                setArtistDuration(Math.max(duration, 10)); // Minimum 10 seconds
              }
            }
          }
        }, 100);
      });
    };

    checkOverflow();
    const resizeHandler = () => checkOverflow();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [track.name, track.artist]);

  const handleRowClick = (e) => {
    // Don't trigger track selection if clicking on buttons
    if (e.target.closest(".track-row__actions") || e.target.closest("button")) {
      return;
    }
    onTrackClick(track);
  };

  return (
    <div
      ref={trackRowRef}
      className={`track-row ${isSelected ? "track-row--selected" : ""}`}
      onClick={handleRowClick}
      data-track-id={trackIdentifier}
    >
      <div
        className={`track-row__art-wrapper ${isPlaying ? "track-row__art-wrapper--playing" : ""}`}
      >
        {albumArtUrl ? (
          <img
            className="track-row__art"
            src={albumArtUrl}
            alt={`${track.name} album art`}
          />
        ) : (
          <div className="track-row__art track-row__art--placeholder">
            <MusicIcon />
          </div>
        )}
      </div>
      <div className="track-row__info">
        <div className="track-row__title-wrapper">
          <div
            className={`track-row__title-inner ${shouldScrollTitle ? "track-row__text--scroll" : ""}`}
            style={
              shouldScrollTitle
                ? { "--scroll-duration": `${titleDuration}s` }
                : {}
            }
          >
            <p ref={titleRef} className="track-row__title">
              {track.name}
            </p>
            {shouldScrollTitle && (
              <p className="track-row__title track-row__text--duplicate">
                {track.name}
              </p>
            )}
          </div>
        </div>
        <div className="track-row__artist-wrapper">
          <div
            className={`track-row__artist-inner ${shouldScrollArtist ? "track-row__text--scroll" : ""}`}
            style={
              shouldScrollArtist
                ? { "--scroll-duration": `${artistDuration}s` }
                : {}
            }
          >
            <p ref={artistRef} className="track-row__artist">
              {track.artist}
            </p>
            {shouldScrollArtist && (
              <p className="track-row__artist track-row__text--duplicate">
                {track.artist}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="track-row__right">
        <div className="track-row__actions">
          <button
            type="button"
            className="track-row__icon-btn"
            onClick={() => onDownloadClick(track)}
            aria-label={isDownloaded ? "Remove download" : "Download"}
          >
            <DownloadIcon filled={isDownloaded} />
          </button>
          <button
            type="button"
            className={`track-row__icon-btn track-row__icon-btn--fav ${isFavorite ? "track-row__icon-btn--active" : ""}`}
            onClick={() => onFavoriteToggle(trackIdentifier)}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <FavoriteIcon filled={isFavorite} />
          </button>
        </div>
        <div className="track-row__meta">
          <p className="track-row__plays">
            {getPlayCount(trackIdentifier)}{" "}
            {getPlayCount(trackIdentifier) === 1 ? "play" : "plays"} this week
          </p>
        </div>
      </div>
    </div>
  );
};

const ClearIcon = () => (
  <svg
    width="16"
    height="16"
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

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Default to 'track' on mobile, 'playlist' on desktop if no view param is set
  const defaultView = isMobile ? "track" : "playlist";
  const view = searchParams.get("view") || defaultView;
  const mobileView = view === "home" ? "playlist" : view;
  const showFavorites = searchParams.get("favorites") === "true";
  const selectedArtist = searchParams.get("artist");
  const selectedPlaylist = searchParams.get("playlist");
  const selectedEra = searchParams.get("era") || "";
  const selectedTheme = searchParams.get("theme") || "";
  const searchQuery = searchParams.get("search") || "";
  const {
    selectTrack,
    currentTrack,
    setPlaylist,
    setFullMusicList,
    isPlaying,
  } = usePlayer();
  const { openRequestSong } = useRequestSong();
  const { openFeedback } = useFeedback();
  const { isLoggedIn } = useCreateAccount();
  const { getTopArtists, getLastSongs, lastSongs, artistCounts } =
    useListeningHistory();
  const { counts: playCounts } = useTrackPlayCounts();
  const { fetchAlbumArt } = useAlbumArt();
  const { playlistTrackIds } = usePlaylist();

  const [musicList, setMusicList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const sidebarContentRef = useRef(null);
  const preloadedRef = useRef(false);

  // Auto-scroll back to playing track after 10s of inactivity
  useEffect(() => {
    if (!isPlaying || !currentTrack || !sidebarContentRef.current) return;

    const scrollContainer = sidebarContentRef.current;
    const trackId = currentTrack.uuid || currentTrack.id;
    let inactivityTimer = null;

    const scrollToPlayingTrack = () => {
      const trackEl = scrollContainer.querySelector(
        `[data-track-id="${trackId}"]`,
      );
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const isVisible =
        rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
      if (!isVisible) {
        trackEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        scrollToPlayingTrack();
      }, 10000);
    };

    const handleScroll = () => resetTimer();
    const handleUserActivity = () => resetTimer();

    resetTimer();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
    };
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    loadMusicList();

    // Load downloads from localStorage
    const loadDownloads = () => {
      try {
        const saved = localStorage.getItem("downloads");
        if (saved) setDownloads(JSON.parse(saved));
      } catch {}
    };
    loadDownloads();

    // Favorites: when logged in, use Firebase only (via FAVORITES_LOADED). When not logged in, use localStorage.
    const loadFavoritesFromStorage = () => {
      try {
        const saved = localStorage.getItem("favorites");
        setFavorites(saved ? JSON.parse(saved) : []);
      } catch {
        setFavorites([]);
      }
    };

    if (!isLoggedIn) {
      loadFavoritesFromStorage();
    }

    const handler = (e) => {
      const favs = e?.detail;
      setFavorites(
        Array.isArray(favs)
          ? favs
          : (() => {
              try {
                const saved = localStorage.getItem("favorites");
                return saved ? JSON.parse(saved) : [];
              } catch {
                return [];
              }
            })(),
      );
    };
    window.addEventListener(FAVORITES_LOADED, handler);
    return () => window.removeEventListener(FAVORITES_LOADED, handler);
  }, [isLoggedIn]);

  // When in favorites view and user removes all favorites, exit favorites view
  useEffect(() => {
    if (showFavorites && favorites.length === 0) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("favorites");
      setSearchParams(newParams);
    }
  }, [showFavorites, favorites.length, searchParams, setSearchParams]);

  const loadMusicList = async () => {
    try {
      setLoading(true);
      setError(null);
      const tracks = await fetchMusicList();
      setMusicList(tracks);
      setFullMusicList(tracks);
    } catch (err) {
      console.error("Error loading music list:", err);
      setError(
        "Failed to load music. Please check your Firebase configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = (track) => {
    setSelectedTrack(track);
    setIsDownloadModalOpen(true);
  };

  const handleDownload = () => {
    if (selectedTrack) {
      // Use UUID if available, otherwise use track ID
      const trackIdentifier = selectedTrack.uuid || selectedTrack.id;

      // Add to downloads
      const newDownloads = [...downloads, trackIdentifier];
      setDownloads(newDownloads);
      localStorage.setItem("downloads", JSON.stringify(newDownloads));

      // Trigger actual download if fileUrl is available (matching reference implementation)
      if (selectedTrack.fileUrl) {
        const link = document.createElement("a");
        link.href = selectedTrack.fileUrl;
        link.download = selectedTrack.name || "track";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    setIsDownloadModalOpen(false);
  };

  const handleFavoriteToggle = (trackIdentifier) => {
    const newFavorites = favorites.includes(trackIdentifier)
      ? favorites.filter((id) => id !== trackIdentifier)
      : [...favorites, trackIdentifier];
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify(newFavorites));
    dispatchFavoritesChanged();
  };

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(15);
  }, [
    searchQuery,
    showFavorites,
    selectedArtist,
    selectedPlaylist,
    selectedEra,
  ]);

  // Extract available eras from music list (eras that have at least one track)
  const availableEras = useMemo(() => {
    const eraSet = new Set();
    musicList.forEach((track) => {
      const year = getYearFromReleaseDate(track.releaseDate);
      const era = getEraFromYear(year);
      if (era) eraSet.add(era);
    });
    return ERA_ORDER.filter((e) => eraSet.has(e));
  }, [musicList]);

  // Extract available themes from music list (themes that appear in at least one track's genre)
  const availableThemes = useMemo(() => {
    return THEME_OPTIONS.filter((theme) =>
      musicList.some((track) => {
        const genreStr = String(track.genre || "").trim();
        return genreStr && genreStr.includes(theme);
      }),
    );
  }, [musicList]);

  // Filter music list based on search, favorites filter, artist selection, or playlist selection
  const filteredMusicList = useMemo(() => {
    let filtered = musicList;

    // Apply playlist filter first if present (highest priority)
    if (selectedPlaylist) {
      if (selectedPlaylist === "Top 10 of the Week") {
        // Dynamic playlist from weekly play counts
        const top10Uuids = Object.entries(playCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([uuid]) => uuid);
        if (top10Uuids.length > 0) {
          filtered = filtered.filter((track) => {
            const id = track.uuid || track.id;
            return top10Uuids.includes(id);
          });
          // Preserve order by play count (highest first)
          const uuidToOrder = Object.fromEntries(
            top10Uuids.map((uuid, i) => [uuid, i]),
          );
          filtered = [...filtered].sort(
            (a, b) =>
              (uuidToOrder[a.uuid || a.id] ?? 999) -
              (uuidToOrder[b.uuid || b.id] ?? 999),
          );
        } else {
          return [];
        }
      } else if (playlistTrackIds[selectedPlaylist]) {
        const playlistUuids = playlistTrackIds[selectedPlaylist];
        if (playlistUuids.length > 0) {
          filtered = filtered.filter((track) => {
            const trackIdentifier = track.uuid || track.id;
            return playlistUuids.includes(trackIdentifier);
          });
        } else {
          return [];
        }
      }
    }

    // Apply favorites filter if present (and no playlist selected)
    if (!selectedPlaylist && showFavorites) {
      filtered = filtered.filter((track) => {
        const trackIdentifier = track.uuid || track.id;
        return favorites.includes(trackIdentifier);
      });
    }

    // Apply artist filter if present (works within playlist or standalone, but not with favorites)
    if (!showFavorites && selectedArtist) {
      filtered = filtered.filter((track) => {
        // Check if the track's artist matches the selected artist
        const trackArtist = track.artist || "";
        return (
          trackArtist.toLowerCase().includes(selectedArtist.toLowerCase()) ||
          selectedArtist.toLowerCase().includes(trackArtist.toLowerCase())
        );
      });
    }

    // Apply era filter if present
    if (selectedEra) {
      filtered = filtered.filter((track) => {
        const year = getYearFromReleaseDate(track.releaseDate);
        return getEraFromYear(year) === selectedEra;
      });
    }

    // Apply theme filter if present (genre contains theme)
    if (selectedTheme) {
      filtered = filtered.filter((track) => {
        const genreStr = String(track.genre || "").trim();
        return genreStr && genreStr.includes(selectedTheme);
      });
    }

    // Finally apply search filter if present (fuzzy match, ~75% similarity)
    if (searchQuery) {
      filtered = filtered.filter((track) =>
        fuzzyMatchesAny(
          searchQuery,
          track.name,
          track.artist,
          track.album,
          track.genre,
        ),
      );
    }

    return filtered;
  }, [
    musicList,
    searchQuery,
    showFavorites,
    selectedArtist,
    selectedPlaylist,
    selectedEra,
    selectedTheme,
    favorites,
    playCounts,
    playlistTrackIds,
  ]);

  // For logged-in users: sort by relevance (top artists, last listened). Otherwise keep order.
  const sortedMusicList = useMemo(() => {
    if (!isLoggedIn) return filteredMusicList;
    const topArtists = getTopArtists(3);
    const recentSongs = getLastSongs();
    return sortTracksByRelevance(
      filteredMusicList,
      topArtists,
      recentSongs,
      musicList,
    );
  }, [isLoggedIn, filteredMusicList, musicList, lastSongs, artistCounts]);

  const handleTrackClick = (track) => {
    selectTrack(track, sortedMusicList);
  };

  // Listen for playArtist event from artist card play button
  useEffect(() => {
    const handlePlayArtist = () => {
      if (sortedMusicList.length > 0) {
        selectTrack(sortedMusicList[0], sortedMusicList);
      }
    };
    window.addEventListener("playArtist", handlePlayArtist);
    return () => window.removeEventListener("playArtist", handlePlayArtist);
  }, [sortedMusicList, selectTrack]);

  // Update playlist when filtered list changes (use sorted for logged-in)
  useEffect(() => {
    if (sortedMusicList.length > 0) {
      setPlaylist(sortedMusicList);
    }
  }, [sortedMusicList, setPlaylist]);

  const handleCloseModal = () => {
    setIsDownloadModalOpen(false);
    setSelectedTrack(null);
  };

  // Tracks to display (first N for lazy load). Put currently playing track at top when in list.
  const visibleTracks = useMemo(() => {
    const slice = sortedMusicList.slice(0, visibleCount);
    if (!currentTrack) return slice;
    const currentId = currentTrack.uuid || currentTrack.id;
    const idx = sortedMusicList.findIndex(
      (t) => (t.uuid || t.id) === currentId,
    );
    if (idx < 0) return slice;
    const rest = sortedMusicList.filter((t) => (t.uuid || t.id) !== currentId);
    return [currentTrack, ...rest.slice(0, visibleCount - 1)];
  }, [sortedMusicList, visibleCount, currentTrack]);
  const hasMore = visibleCount < sortedMusicList.length;

  // On mobile: preload track images during 4 sec loading screen so they're ready when it fades
  useEffect(() => {
    if (
      !isMobile ||
      loading ||
      preloadedRef.current ||
      sortedMusicList.length === 0
    )
      return;
    preloadedRef.current = true;
    const toPreload = sortedMusicList.slice(0, 15);
    toPreload.forEach((track) => {
      if (
        !track?.coverUrl &&
        !track?.artworkUrl &&
        !track?.albumArtUrl &&
        track?.fileUrl
      ) {
        fetchAlbumArt(track);
      }
    });
  }, [isMobile, loading, sortedMusicList, fetchAlbumArt]);

  // Load more on scroll
  const loadMoreRef = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = loadMoreRef.current;
    const root = sidebarContentRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => Math.min(n + 15, sortedMusicList.length));
        }
      },
      { root: root || null, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sortedMusicList.length]);

  const handleClearPlaylistFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("playlist");
    setSearchParams(newSearchParams);
  };

  const handleEraClick = (era) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedEra === era) {
      newSearchParams.delete("era");
    } else {
      newSearchParams.set("era", era);
      newSearchParams.delete("playlist");
      newSearchParams.delete("favorites");
    }
    setSearchParams(newSearchParams);
  };

  const handleThemeClick = (theme) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedTheme === theme) {
      newSearchParams.delete("theme");
    } else {
      newSearchParams.set("theme", theme);
      newSearchParams.delete("playlist");
      newSearchParams.delete("favorites");
    }
    setSearchParams(newSearchParams);
  };

  const handleClearEraFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("era");
    setSearchParams(newSearchParams);
  };

  const selectedTrackData = selectedTrack
    ? {
        name: selectedTrack.name,
        artist: selectedTrack.artist,
        size: selectedTrack.fileSize
          ? `${(selectedTrack.fileSize / (1024 * 1024)).toFixed(1)} MB`
          : "Unknown size",
      }
    : {
        name: "",
        artist: "",
        size: "",
      };

  return (
    <div className={`home home--mobile-view-${mobileView}`}>
      <div className="home__grid">
        <aside className="home__sidebar">
          {showFavorites && !loading && !error && (
            <div className="home__sidebar-header">
              <h3 className="home__sidebar-title">
                <FavoriteIcon filled={true} />
                My Favorites
              </h3>
            </div>
          )}
          {!showFavorites && !loading && !error && (
            <div className="home__sidebar-header home__sidebar-header--tracks">
              <h3 className="home__sidebar-title home__sidebar-title--tracks">
                <MusicIconGradient />
                {selectedPlaylist
                  ? selectedPlaylist === "Top 10 of the Week"
                    ? "Top 10 Songs of the Week on Beatify"
                    : `Tracks for "${selectedPlaylist}" playlist`
                  : selectedEra
                    ? `Tracks from ${selectedEra}`
                    : selectedTheme
                      ? `Tracks with theme: ${selectedTheme}`
                      : "Tracks"}
                {(selectedPlaylist || selectedEra || selectedTheme) && (
                  <button
                    type="button"
                    className="home__clear-filter-btn"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.delete("playlist");
                      p.delete("era");
                      p.delete("theme");
                      setSearchParams(p);
                    }}
                    aria-label="Clear filter"
                  >
                    <ClearIcon />
                  </button>
                )}
              </h3>
            </div>
          )}
          <div className="home__sidebar-content" ref={sidebarContentRef}>
            {loading ? (
              <div className="home__loading">
                <p>Loading music...</p>
              </div>
            ) : error ? (
              <div className="home__error">
                <p>{error}</p>
                <button onClick={loadMusicList} className="home__retry-btn">
                  Retry
                </button>
              </div>
            ) : filteredMusicList.length === 0 ? (
              <div className="home__empty">
                <p>
                  {showFavorites
                    ? "No favorite tracks found."
                    : "No music tracks found."}
                </p>
                <p className="home__empty-hint">
                  {showFavorites ? (
                    "Add songs to My Favorites by clicking the heart icon!"
                  ) : (
                    <>
                      Can&apos;t find a song?{" "}
                      <button
                        type="button"
                        className="home__request-song-btn"
                        onClick={() => openRequestSong()}
                      >
                        Request a song
                      </button>
                      {" · "}
                      <button
                        type="button"
                        className="home__request-song-btn"
                        onClick={() => openFeedback()}
                      >
                        Send feedback
                      </button>
                      {" · or reach out to "}
                      <a
                        href="mailto:siddhantroy225@gmail.com"
                        className="home__email-link"
                      >
                        siddhantroy225@gmail.com
                      </a>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <>
                {visibleTracks.map((track) => {
                  const trackIdentifier = track.uuid || track.id;
                  const currentTrackId = currentTrack
                    ? currentTrack.uuid || currentTrack.id
                    : null;
                  return (
                    <MusicTrack
                      key={track.id}
                      track={track}
                      onDownloadClick={handleDownloadClick}
                      onFavoriteToggle={handleFavoriteToggle}
                      onTrackClick={handleTrackClick}
                      favorites={favorites}
                      downloads={downloads}
                      isSelected={trackIdentifier === currentTrackId}
                      isPlaying={
                        isPlaying && trackIdentifier === currentTrackId
                      }
                    />
                  );
                })}
                {hasMore && (
                  <div ref={loadMoreRef} className="home__load-more-sentinel" />
                )}
              </>
            )}
          </div>
        </aside>
        <main className="home__main">
          <Playlist hasFavorites={favorites.length > 0} />
        </main>
        {isMobile && (
          <section className="home__moods" aria-hidden={mobileView !== "moods"}>
            <div className="home__moods-grid">
              {ERA_ORDER.filter((e) => availableEras.includes(e)).map(
                (era, idx) => (
                  <button
                    key={era}
                    type="button"
                    className={`home__moods-rect home__moods-rect--img ${selectedEra === era ? "home__moods-rect--selected" : ""}`}
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url("${MOODS_IMAGES[idx % MOODS_IMAGES.length]}")`,
                    }}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (selectedEra === era) p.delete("era");
                      else p.set("era", era);
                      p.set("view", "track");
                      setSearchParams(p);
                    }}
                  >
                    {era}
                  </button>
                ),
              )}
              {availableThemes.map((theme, idx) => {
                const eraCount = ERA_ORDER.filter((e) =>
                  availableEras.includes(e),
                ).length;
                const imgIdx = eraCount + idx;
                return (
                  <button
                    key={theme}
                    type="button"
                    className={`home__moods-rect home__moods-rect--img ${selectedTheme === theme ? "home__moods-rect--selected" : ""}`}
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url("${MOODS_IMAGES[imgIdx % MOODS_IMAGES.length]}")`,
                    }}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (selectedTheme === theme) p.delete("theme");
                      else p.set("theme", theme);
                      p.set("view", "track");
                      setSearchParams(p);
                    }}
                    title={theme}
                  >
                    {theme}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <aside className="home__era">
          <div className="home__era-header">
            <h4 className="home__era-title">
              <MoodsIconGradient />
              Moods
            </h4>
          </div>
          <div className="home__era-content">
            {availableEras.length === 0 ? (
              <p className="home__era-empty">No era data from tracks</p>
            ) : (
              availableEras.map((era) => (
                <button
                  key={era}
                  type="button"
                  className={`home__era-badge home__era-badge--${era.replace(/\s/g, "")} ${selectedEra === era ? "home__era-badge--selected" : ""}`}
                  onClick={() => handleEraClick(era)}
                >
                  {era}
                </button>
              ))
            )}
            {availableThemes.length > 0 && (
              <div className="home__era-themes">
                {availableThemes.map((theme, idx) => {
                  const isLong = theme.length > 20;
                  const colorClass = `home__era-theme-badge--c${idx % 10}`;
                  return (
                    <button
                      key={theme}
                      type="button"
                      className={`home__era-theme-badge ${colorClass} ${selectedTheme === theme ? "home__era-theme-badge--selected" : ""} ${isLong ? "home__era-theme-badge--scroll" : ""}`}
                      onClick={() => handleThemeClick(theme)}
                      title={theme}
                    >
                      <span className="home__era-theme-badge-inner">
                        <span className="home__era-theme-badge-text">
                          {theme}
                        </span>
                        {isLong && (
                          <span className="home__era-theme-badge-text home__era-theme-badge-text--duplicate">
                            {theme}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={handleCloseModal}
        songName={selectedTrackData.name}
        artistName={selectedTrackData.artist}
        fileSize={selectedTrackData.size}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default Home;
