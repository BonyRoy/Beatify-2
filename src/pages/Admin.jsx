import React, { useState, useEffect, useRef } from "react";
import { parseBlob, selectCover } from "music-metadata";
import { storage, db } from "../firebase/config";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Lock,
  Music,
  FolderOpen,
  FileText,
  RefreshCw,
  Search,
  Save,
  Upload,
  List,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  FileUp,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Check,
  Users,
  Headphones,
  X,
  Settings,
  BookOpen,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePlaylist } from "../context/PlaylistContext";
import * as XLSX from "xlsx";
import {
  fetchSongRequests,
  markRequestFulfilledAndNotify,
} from "../services/songRequestService";
import { fetchAccounts, deleteAccount } from "../services/accountService";
import { fetchAllUserListeningStats } from "../services/userListeningStatsService";
import { createAdminMessageNotification } from "../services/notificationService";
import {
  fetchFeedback,
  deleteFeedback,
  clearAllFeedback,
} from "../services/feedbackService";
import {
  fetchTrackPlayCounts,
  clearAllCounts,
} from "../services/trackPlayCountsService";
import {
  getAdminSettings,
  updateAdminPassword,
  updateSessionTimeout,
  createAdminSession,
  verifyAdminSession,
  invalidateAdminSession,
  initAdminSettingsIfNeeded,
} from "../services/adminSettingsService";
import {
  fetchPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from "../services/playlistService";
import {
  fetchFeaturedStory,
  updateFeaturedStory,
} from "../services/featuredStoryService";
import "./Admin.css";

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

const ThemeToggle = ({ isDark, toggleTheme }) => (
  <button
    type="button"
    className={`admin-theme-toggle ${isDark ? "admin-theme-toggle--dark" : "admin-theme-toggle--light"}`}
    onClick={toggleTheme}
    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
  >
    <span className="admin-theme-toggle__track">
      <span className="admin-theme-toggle__icon admin-theme-toggle__icon--left">
        <SunIcon />
      </span>
      <span className="admin-theme-toggle__icon admin-theme-toggle__icon--right">
        <MoonStarsIcon />
      </span>
      <span className="admin-theme-toggle__knob" />
    </span>
  </button>
);

const ClearWeeklyCountsButton = ({ onClear, disabled = false }) => {
  const [clearing, setClearing] = useState(false);
  const handleClick = async () => {
    if (clearing || disabled) return;
    if (
      !window.confirm(
        "Reset all weekly play counts to 0? This starts a new week.",
      )
    )
      return;
    setClearing(true);
    try {
      await clearAllCounts();
      onClear?.();
    } catch (err) {
      console.error("Failed to clear counts:", err);
      alert("Failed to clear counts. Please try again.");
    } finally {
      setClearing(false);
    }
  };
  return (
    <button
      type="button"
      className="admin-clear-weekly-counts-btn"
      onClick={handleClick}
      disabled={disabled || clearing}
      title="Reset all play counts to 0 (start new week)"
    >
      {clearing ? (
        <>
          <RefreshCw size={14} className="admin-clear-weekly-counts-spinner" />
          Resetting...
        </>
      ) : (
        <>
          <RefreshCw size={14} />
          Reset weekly counts
        </>
      )}
    </button>
  );
};

const Admin = () => {
  const { isDark, toggleTheme } = useTheme();
  const { refreshPlaylists } = usePlaylist();
  // Generate UUID function
  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  };

  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    genre: "",
    album: "",
    releaseDate: "",
  });
  const [musicFile, setMusicFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trackUUID, setTrackUUID] = useState(generateUUID());
  const [isOtherGenre, setIsOtherGenre] = useState(false);
  const [isOtherArtist, setIsOtherArtist] = useState(false);
  const [customGenre, setCustomGenre] = useState("");
  const [customArtist, setCustomArtist] = useState("");
  const [existingTracks, setExistingTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [bulkEditData, setBulkEditData] = useState({});
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkCurrentPage, setBulkCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(null); // 'releaseDate' | 'uploadedAt'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [playCounts, setPlayCounts] = useState({});
  const [songRequests, setSongRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [clearingRequestId, setClearingRequestId] = useState(null);
  const [requestCurrentPage, setRequestCurrentPage] = useState(1);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);
  const [clearingAllFeedback, setClearingAllFeedback] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsCurrentPage, setAccountsCurrentPage] = useState(1);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [listeningStats, setListeningStats] = useState([]);
  const [loadingListeningStats, setLoadingListeningStats] = useState(false);
  const [listeningStatsCurrentPage, setListeningStatsCurrentPage] = useState(1);
  const [listeningStatsSearchQuery, setListeningStatsSearchQuery] =
    useState("");
  const [expandedListeningIds, setExpandedListeningIds] = useState(new Set());
  const [listeningChartTab, setListeningChartTab] = useState("bar");
  const [listeningChartDropdownOpen, setListeningChartDropdownOpen] =
    useState(false);
  const listeningChartDropdownRef = useRef(null);
  const [isAdminMobile, setIsAdminMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [messageModalAccount, setMessageModalAccount] = useState(null);
  const [messageModalSendToAll, setMessageModalSendToAll] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [accountsSearchQuery, setAccountsSearchQuery] = useState("");
  const [settingsCurrentPwd, setSettingsCurrentPwd] = useState("");
  const [settingsNewPwd, setSettingsNewPwd] = useState("");
  const [settingsConfirmPwd, setSettingsConfirmPwd] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsUpdating, setSettingsUpdating] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(5);
  const [sessionTimeoutUpdating, setSessionTimeoutUpdating] = useState(false);
  const [sessionTimeoutError, setSessionTimeoutError] = useState("");
  const [sessionTimeoutSuccess, setSessionTimeoutSuccess] = useState("");
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({
    name: "",
    image: "",
    trackIds: "",
  });
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [playlistSaving, setPlaylistSaving] = useState(false);
  const [playlistError, setPlaylistError] = useState("");
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);

  const [storyForm, setStoryForm] = useState({
    byline: "",
    brand: "",
    tagline: "",
    bannerImageUrl: "",
    songTitle: "",
    songDescription: "",
    featuredTrackUuid: "",
  });
  const [storyBannerFile, setStoryBannerFile] = useState(null);
  const [storyBannerPreviewUrl, setStoryBannerPreviewUrl] = useState(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storySaving, setStorySaving] = useState(false);
  const [storyError, setStoryError] = useState("");
  const [storySuccess, setStorySuccess] = useState("");

  const REQUEST_RECORDS_PER_PAGE = 10;
  const FEEDBACK_RECORDS_PER_PAGE = 10;
  const ACCOUNTS_RECORDS_PER_PAGE = 10;
  const LISTENING_STATS_RECORDS_PER_PAGE = 10;

  const excelFileInputRef = useRef(null);
  const storyBannerInputRef = useRef(null);

  const BULK_RECORDS_PER_PAGE = 20;

  const genres = [
    "Bollywood-Romantic",
    "Filmi-Dance",
    "Filmi-Classical",
    "Filmi-Sufi",
    "Filmi-Folk",
    "Bollywood-Pop",
    "Bollywood-Hip Hop",
    "Bollywood-R&B",
    "Bollywood-Rock",
    "Bollywood-Electronic",
    "Bollywood-Jazz",
    "Bollywood-Reggae",
    "Bollywood-Blues",
    "Bollywood-Indie",
    "Bollywood-Alternative",
    "Bollywood-Punk",
    "Pop",
    "Rock",
    "Hip Hop",
    "R&B",
    "Country",
    "Electronic",
    "Jazz",
    "Classical",
    "Folk",
    "Reggae",
    "Blues",
    "Indie",
    "Alternative",
    "Punk",
  ];

  const [artists, setArtists] = useState([]);

  useEffect(() => {
    initAdminSettingsIfNeeded();
    sessionStorage.removeItem("adminAuthenticated");
    const token = sessionStorage.getItem("adminSessionToken");
    if (token) {
      verifyAdminSession(token).then((valid) => {
        if (valid) {
          setIsAuthenticated(true);
          fetchExistingTracks();
          setSessionExpiredMessage("");
        } else {
          sessionStorage.removeItem("adminSessionToken");
          setSessionExpiredMessage("Session expired. Please log in again.");
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExistingTracks();
    }
  }, [isAuthenticated]);

  // Periodic session verification - log out when token expires
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem("adminSessionToken");
    if (!token) return;

    const checkSession = () => {
      verifyAdminSession(token).then((valid) => {
        if (!valid) {
          sessionStorage.removeItem("adminSessionToken");
          invalidateAdminSession(token);
          setSessionExpiredMessage("Session expired. Please log in again.");
          setIsAuthenticated(false);
        }
      });
    };

    const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 min
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadPlayCounts = () => {
    fetchTrackPlayCounts()
      .then(setPlayCounts)
      .catch(() => setPlayCounts({}));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlayCounts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if ((activeTab === "hip" || activeTab === "listening") && isAuthenticated) {
      loadPlayCounts();
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "playlist" && isAuthenticated) {
      setLoadingPlaylists(true);
      fetchPlaylists()
        .then(setPlaylists)
        .finally(() => setLoadingPlaylists(false));
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "settings" && isAuthenticated) {
      getAdminSettings().then((s) =>
        setSessionTimeoutMinutes(s.sessionTimeoutMinutes),
      );
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (storyBannerFile) {
      const url = URL.createObjectURL(storyBannerFile);
      setStoryBannerPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setStoryBannerPreviewUrl(null);
    }
  }, [storyBannerFile]);

  useEffect(() => {
    if (activeTab === "story" && isAuthenticated) {
      setStoryLoading(true);
      fetchFeaturedStory()
        .then((s) =>
          setStoryForm({
            byline: s?.byline ?? "",
            brand: s?.brand ?? "",
            tagline: s?.tagline ?? "",
            bannerImageUrl: s?.bannerImageUrl ?? "",
            songTitle: s?.songTitle ?? "",
            songDescription: s?.songDescription ?? "",
            featuredTrackUuid: s?.featuredTrackUuid ?? "",
          }),
        )
        .finally(() => setStoryLoading(false));
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "hip" && existingTracks.length > 0) {
      const data = {};
      existingTracks.forEach((t) => {
        data[t.id] = {
          name: t.name || "",
          artist: t.artist || "",
          genre: t.genre || "",
          album: t.album || "",
          releaseDate: t.releaseDate || "",
        };
      });
      setBulkEditData(data);
      setBulkSelectedIds(new Set());
      setBulkCurrentPage(1);
    }
  }, [activeTab, existingTracks]);

  useEffect(() => {
    if (activeTab === "request" && isAuthenticated) {
      const loadRequests = async () => {
        setLoadingRequests(true);
        try {
          const requests = await fetchSongRequests();
          setSongRequests(requests);
        } catch (err) {
          console.error("Error loading song requests:", err);
        } finally {
          setLoadingRequests(false);
        }
      };
      loadRequests();
      setRequestCurrentPage(1);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "feedback" && isAuthenticated) {
      const loadFeedback = async () => {
        setLoadingFeedback(true);
        try {
          const data = await fetchFeedback();
          setFeedbackList(data);
        } catch (err) {
          console.error("Error loading feedback:", err);
        } finally {
          setLoadingFeedback(false);
        }
      };
      loadFeedback();
      setFeedbackCurrentPage(1);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "accounts" && isAuthenticated) {
      const loadAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const data = await fetchAccounts();
          setAccounts(data);
        } catch (err) {
          console.error("Error loading accounts:", err);
        } finally {
          setLoadingAccounts(false);
        }
      };
      loadAccounts();
      setAccountsCurrentPage(1);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === "listening" && isAuthenticated) {
      const loadStatsAndAccounts = async () => {
        setLoadingListeningStats(true);
        try {
          const [stats, accountsData] = await Promise.all([
            fetchAllUserListeningStats(),
            fetchAccounts(),
          ]);
          setListeningStats(stats);
          setAccounts(accountsData);
        } catch (err) {
          console.error("Error loading listening stats:", err);
        } finally {
          setLoadingListeningStats(false);
        }
      };
      loadStatsAndAccounts();
      setListeningStatsCurrentPage(1);
    }
  }, [activeTab, isAuthenticated]);

  const handleClearRequest = async (req) => {
    setClearingRequestId(req.id);
    try {
      await markRequestFulfilledAndNotify(req);
      setSongRequests((prev) => {
        const next = prev.filter((r) => r.id !== req.id);
        const maxPage = Math.ceil(next.length / REQUEST_RECORDS_PER_PAGE) || 1;
        setRequestCurrentPage((p) => Math.max(1, Math.min(p, maxPage)));
        return next;
      });
    } catch (err) {
      console.error("Error marking request fulfilled:", err);
    } finally {
      setClearingRequestId(null);
    }
  };

  const handleDeleteFeedback = async (id) => {
    setDeletingFeedbackId(id);
    try {
      await deleteFeedback(id);
      setFeedbackList((prev) => {
        const next = prev.filter((f) => f.id !== id);
        const maxPage = Math.ceil(next.length / FEEDBACK_RECORDS_PER_PAGE) || 1;
        setFeedbackCurrentPage((p) => Math.max(1, Math.min(p, maxPage)));
        return next;
      });
    } catch (err) {
      console.error("Error deleting feedback:", err);
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const handleClearAllFeedback = async () => {
    if (!window.confirm("Delete all feedback? This cannot be undone.")) return;
    setClearingAllFeedback(true);
    try {
      await clearAllFeedback();
      setFeedbackList([]);
      setFeedbackCurrentPage(1);
    } catch (err) {
      console.error("Error clearing feedback:", err);
    } finally {
      setClearingAllFeedback(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }
    setDeletingAccountId(id);
    try {
      await deleteAccount(id);
      setAccounts((prev) => {
        const next = prev.filter((a) => a.id !== id);
        const maxPage = Math.ceil(next.length / ACCOUNTS_RECORDS_PER_PAGE) || 1;
        setAccountsCurrentPage((p) => Math.max(1, Math.min(p, maxPage)));
        return next;
      });
    } catch (err) {
      console.error("Error deleting account:", err);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleOpenMessageModal = (acc) => {
    setMessageModalAccount(acc);
    setMessageModalSendToAll(false);
    setMessageSubject("");
    setMessageBody("");
  };

  const handleOpenMessageModalAll = (filteredAccounts) => {
    setMessageModalAccount({ filteredAccounts });
    setMessageModalSendToAll(true);
    setMessageSubject("");
    setMessageBody("");
  };

  const handleCloseMessageModal = () => {
    setMessageModalAccount(null);
    setMessageModalSendToAll(false);
    setMessageSubject("");
    setMessageBody("");
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim()) return;
    setSendingMessage(true);
    try {
      if (messageModalSendToAll && messageModalAccount?.filteredAccounts) {
        const targets = messageModalAccount.filteredAccounts.filter((a) =>
          a.email?.trim(),
        );
        for (const acc of targets) {
          await createAdminMessageNotification({
            email: acc.email,
            userName: acc.name || "",
            subject: messageSubject.trim(),
            body: messageBody.trim(),
          });
        }
      } else if (messageModalAccount?.email?.trim()) {
        await createAdminMessageNotification({
          email: messageModalAccount.email,
          userName: messageModalAccount.name || "",
          subject: messageSubject.trim(),
          body: messageBody.trim(),
        });
      }
      handleCloseMessageModal();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setSortDropdownOpen(false);
      }
      if (
        listeningChartDropdownRef.current &&
        !listeningChartDropdownRef.current.contains(e.target)
      ) {
        setListeningChartDropdownOpen(false);
      }
    };
    if (sortDropdownOpen || listeningChartDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortDropdownOpen, listeningChartDropdownOpen]);

  useEffect(() => {
    const checkMobile = () => setIsAdminMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchExistingTracks = async () => {
    try {
      setLoadingTracks(true);
      const q = query(collection(db, "music"), orderBy("uploadedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const tracks = [];
      querySnapshot.forEach((doc) => {
        tracks.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setExistingTracks(tracks);

      // Extract unique artists from tracks (sorted alphabetically)
      const uniqueArtists = [
        ...new Set(tracks.map((t) => t.artist).filter(Boolean)),
      ].sort();
      setArtists(uniqueArtists);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenreChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setIsOtherGenre(true);
      setFormData((prev) => ({ ...prev, genre: "" }));
    } else {
      setIsOtherGenre(false);
      setFormData((prev) => ({ ...prev, genre: value }));
    }
  };

  const handleArtistChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setIsOtherArtist(true);
      setFormData((prev) => ({ ...prev, artist: "" }));
    } else {
      setIsOtherArtist(false);
      setFormData((prev) => ({ ...prev, artist: value }));
    }
  };

  const resetArtistToDropdown = () => {
    setIsOtherArtist(false);
    setCustomArtist("");
    setFormData((prev) => ({ ...prev, artist: "" }));
  };

  const resetGenreToDropdown = () => {
    setIsOtherGenre(false);
    setCustomGenre("");
    setFormData((prev) => ({ ...prev, genre: "" }));
  };

  const CustomDropdown = ({
    value,
    options,
    onChange,
    placeholder,
    onOtherSelect,
    isOpen,
    setIsOpen,
    searchable = false,
  }) => {
    const dropdownRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        if (searchable) {
          setSearchQuery("");
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, setIsOpen, searchable]);

    const handleSelect = (optionValue) => {
      if (optionValue === "Other") {
        onOtherSelect();
      } else {
        onChange({ target: { value: optionValue } });
      }
      setIsOpen(false);
      setSearchQuery("");
    };

    const selectedLabel =
      value === ""
        ? placeholder
        : options.find((opt) => opt === value) || value;

    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.toLowerCase().includes(searchQuery.toLowerCase().trim()),
        )
      : options;

    return (
      <div className="admin-dropdown" ref={dropdownRef}>
        <div
          className="admin-dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{selectedLabel}</span>
          <span className="admin-dropdown-arrow">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
        {isOpen && (
          <div className="admin-dropdown-menu">
            {searchable && (
              <div
                className="admin-dropdown-search"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search artists..."
                  className="admin-dropdown-search-input"
                />
              </div>
            )}
            <div className="admin-dropdown-list">
              {filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`admin-dropdown-item ${
                    value === option ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </div>
              ))}
              <div
                className="admin-dropdown-item other-option"
                onClick={() => handleSelect("Other")}
              >
                Other
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
      setTrackUUID(generateUUID());
    } else {
      alert("Please select a valid audio file");
      e.target.value = "";
    }
  };

  // Extract embedded album art from MP3/audio file
  const extractCoverFromFile = async (file) => {
    try {
      const metadata = await parseBlob(file);
      if (!metadata?.common?.picture?.length) return null;
      const cover = selectCover(metadata.common.picture);
      if (!cover || !cover.data) return null;
      const mime = cover.format || "image/jpeg";
      const ext = mime === "image/png" ? "png" : "jpg";
      const blob = new Blob([cover.data], { type: mime });
      return { blob, ext, mime };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalGenre = isOtherGenre ? customGenre : formData.genre;
    const finalArtist = isOtherArtist ? customArtist : formData.artist;

    if (!musicFile && !editingTrackId) {
      alert("Please select a music file");
      return;
    }

    if (
      !formData.name ||
      !finalArtist ||
      !finalGenre ||
      !formData.album ||
      !formData.releaseDate
    ) {
      alert("Please fill in all fields");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let downloadURL = "";
      let fileName = "";
      let fileSize = 0;
      let coverUrl = null;

      if (editingTrackId) {
        const existingTrack = existingTracks.find(
          (t) => t.id === editingTrackId,
        );
        if (musicFile) {
          if (existingTrack.fileName) {
            const oldFileRef = ref(storage, `music/${existingTrack.fileName}`);
            try {
              await deleteObject(oldFileRef);
            } catch (error) {
              console.warn("Error deleting old file:", error);
            }
          }

          const timestamp = Date.now();
          fileName = `${timestamp}_${musicFile.name}`;
          const storageRef = ref(storage, `music/${fileName}`);
          setUploadProgress(25);
          const snapshot = await uploadBytes(storageRef, musicFile);
          setUploadProgress(50);
          downloadURL = await getDownloadURL(snapshot.ref);
          fileSize = musicFile.size;

          // Extract and upload embedded album art from MP3
          const coverData = await extractCoverFromFile(musicFile);
          if (coverData) {
            const coverFileName = `covers/${timestamp}_${editingTrackId}.${coverData.ext}`;
            const coverRef = ref(storage, coverFileName);
            await uploadBytes(coverRef, coverData.blob);
            coverUrl = await getDownloadURL(coverRef);
          }
        } else {
          downloadURL = existingTrack.fileUrl;
          fileName = existingTrack.fileName;
          fileSize = existingTrack.fileSize;
          coverUrl =
            existingTrack.coverUrl ||
            existingTrack.artworkUrl ||
            existingTrack.albumArtUrl;
        }

        setUploadProgress(75);
        const trackRef = doc(db, "music", editingTrackId);
        await updateDoc(trackRef, {
          name: formData.name,
          artist: finalArtist,
          genre: finalGenre,
          album: formData.album,
          releaseDate: formData.releaseDate,
          fileUrl: downloadURL,
          fileName: fileName,
          fileSize: fileSize,
          ...(musicFile && { originalFileName: musicFile.name }),
          ...(coverUrl && { coverUrl }),
        });

        setUploadProgress(100);
        alert("Track updated successfully!");
        setEditingTrackId(null);
      } else {
        const timestamp = Date.now();
        fileName = `${timestamp}_${musicFile.name}`;
        const storageRef = ref(storage, `music/${fileName}`);

        setUploadProgress(25);
        const snapshot = await uploadBytes(storageRef, musicFile);

        setUploadProgress(50);
        downloadURL = await getDownloadURL(snapshot.ref);
        fileSize = musicFile.size;

        // Extract and upload embedded album art from MP3
        const coverData = await extractCoverFromFile(musicFile);
        if (coverData) {
          const coverFileName = `covers/${timestamp}_${trackUUID}.${coverData.ext}`;
          const coverRef = ref(storage, coverFileName);
          await uploadBytes(coverRef, coverData.blob);
          coverUrl = await getDownloadURL(coverRef);
        }

        setUploadProgress(75);
        await addDoc(collection(db, "music"), {
          uuid: trackUUID,
          name: formData.name,
          artist: finalArtist,
          genre: finalGenre,
          album: formData.album,
          releaseDate: formData.releaseDate,
          fileUrl: downloadURL,
          fileName: fileName,
          originalFileName: musicFile.name,
          fileSize: fileSize,
          ...(coverUrl && { coverUrl }),
          uploadedAt: serverTimestamp(),
          createdBy: "admin",
        });

        setUploadProgress(100);
        alert("Music uploaded successfully!");
      }

      setFormData({
        name: "",
        artist: "",
        genre: "",
        album: "",
        releaseDate: "",
      });
      setMusicFile(null);
      setTrackUUID(generateUUID());
      setIsOtherGenre(false);
      setIsOtherArtist(false);
      setCustomGenre("");
      setCustomArtist("");
      if (document.getElementById("musicFile")) {
        document.getElementById("musicFile").value = "";
      }

      await fetchExistingTracks();
    } catch (error) {
      console.error("Error uploading/updating music:", error);
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (track) => {
    setEditingTrackId(track.id);
    setFormData({
      name: track.name || "",
      artist: track.artist || "",
      genre: track.genre || "",
      album: track.album || "",
      releaseDate: track.releaseDate || "",
    });

    const genreInList = genres.includes(track.genre);
    const artistInList = artists.includes(track.artist);

    setIsOtherGenre(!genreInList);
    setIsOtherArtist(!artistInList);

    if (!genreInList) {
      setCustomGenre(track.genre || "");
    }
    if (!artistInList) {
      setCustomArtist(track.artist || "");
    }

    setTrackUUID(track.uuid || generateUUID());
    setMusicFile(null);
    if (document.getElementById("musicFile")) {
      document.getElementById("musicFile").value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (trackId) => {
    if (!window.confirm("Are you sure you want to delete this track?")) {
      return;
    }

    try {
      const track = existingTracks.find((t) => t.id === trackId);

      await deleteDoc(doc(db, "music", trackId));

      if (track.fileName) {
        const fileRef = ref(storage, `music/${track.fileName}`);
        try {
          await deleteObject(fileRef);
        } catch (error) {
          console.warn("Error deleting file from storage:", error);
        }
      }

      alert("Track deleted successfully!");
      await fetchExistingTracks();
    } catch (error) {
      console.error("Error deleting track:", error);
      alert("Error deleting track: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingTrackId(null);
    setFormData({
      name: "",
      artist: "",
      genre: "",
      album: "",
      releaseDate: "",
    });
    setMusicFile(null);
    setIsOtherGenre(false);
    setIsOtherArtist(false);
    setCustomGenre("");
    setCustomArtist("");
    setTrackUUID(generateUUID());
    if (document.getElementById("musicFile")) {
      document.getElementById("musicFile").value = "";
    }
  };

  const handleBulkFieldChange = (trackId, field, value) => {
    setBulkEditData((prev) => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        [field]: value,
      },
    }));
  };

  const toggleBulkSelect = (trackId) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleBulkSelectAll = (paginatedTracks) => {
    const allSelected = paginatedTracks.every((t) => bulkSelectedIds.has(t.id));
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedTracks.forEach((t) => {
        if (allSelected) next.delete(t.id);
        else next.add(t.id);
      });
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    const trackIds = [...bulkSelectedIds].filter((id) => bulkEditData[id]);
    if (trackIds.length === 0) {
      alert(
        "No tracks selected. Tick the checkboxes for records you want to update.",
      );
      return;
    }
    setBulkUpdating(true);
    try {
      let successCount = 0;
      for (const trackId of trackIds) {
        const data = bulkEditData[trackId];
        if (!data) continue;
        const trackRef = doc(db, "music", trackId);
        await updateDoc(trackRef, {
          name: data.name || "",
          artist: data.artist || "",
          genre: data.genre || "",
          album: data.album || "",
          releaseDate: data.releaseDate || "",
        });
        successCount++;
      }
      alert(`Successfully updated ${successCount} track(s)!`);
      await fetchExistingTracks();
    } catch (error) {
      console.error("Error bulk updating:", error);
      alert("Error updating tracks: " + error.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleExcelDownload = () => {
    if (existingTracks.length === 0) {
      alert("No tracks to export.");
      return;
    }
    const rows = existingTracks.map((t) => ({
      Name: t.name || "",
      Artist: t.artist || "",
      Genre: t.genre || "",
      Album: t.album || "",
      "Release Date": t.releaseDate || "",
      UUID: t.uuid || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracks");
    XLSX.writeFile(
      wb,
      `beatify-tracks-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const handleExcelUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length < 2) {
          alert("Excel file must have header row and at least one data row.");
          if (excelFileInputRef.current) excelFileInputRef.current.value = "";
          return;
        }
        const headers = json[0].map((h) => String(h || "").trim());
        const uuidIdx = headers.findIndex((h) => h.toLowerCase() === "uuid");
        const artistIdx = headers.findIndex(
          (h) => h.toLowerCase() === "artist",
        );
        const genreIdx = headers.findIndex((h) => h.toLowerCase() === "genre");
        const albumIdx = headers.findIndex((h) => h.toLowerCase() === "album");
        const releaseIdx = headers.findIndex(
          (h) => h.toLowerCase().replace(/\s/g, "") === "releasedate",
        );
        if (
          uuidIdx < 0 ||
          artistIdx < 0 ||
          genreIdx < 0 ||
          albumIdx < 0 ||
          releaseIdx < 0
        ) {
          alert(
            "Excel must have columns: Name, Artist, Genre, Album, Release Date, UUID",
          );
          if (excelFileInputRef.current) excelFileInputRef.current.value = "";
          return;
        }
        const uuidToTrack = {};
        existingTracks.forEach((t) => {
          if (t.uuid) uuidToTrack[t.uuid] = t;
        });
        const updates = [];
        let matched = 0;
        let skipped = 0;
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          const uuid = String(row[uuidIdx] ?? "").trim();
          if (!uuid) {
            skipped++;
            continue;
          }
          const track = uuidToTrack[uuid];
          if (!track) {
            skipped++;
            continue;
          }
          const artist = String(row[artistIdx] ?? "").trim();
          const genre = String(row[genreIdx] ?? "").trim();
          const album = String(row[albumIdx] ?? "").trim();
          let releaseDate = row[releaseIdx];
          if (typeof releaseDate === "number" && releaseDate > 0) {
            const d = new Date((releaseDate - 25569) * 86400 * 1000);
            releaseDate = d.toISOString().slice(0, 10);
          } else {
            releaseDate = String(releaseDate ?? "").trim();
          }
          updates.push({
            trackId: track.id,
            artist,
            genre,
            album,
            releaseDate,
          });
          matched++;
        }
        if (updates.length === 0) {
          alert(
            "No matching rows found. Ensure UUID column matches your tracks.",
          );
          if (excelFileInputRef.current) excelFileInputRef.current.value = "";
          return;
        }
        setBulkUpdating(true);
        for (const u of updates) {
          const trackRef = doc(db, "music", u.trackId);
          await updateDoc(trackRef, {
            artist: u.artist,
            genre: u.genre,
            album: u.album,
            releaseDate: u.releaseDate,
          });
        }
        alert(
          `Updated ${matched} track(s).${skipped ? ` Skipped ${skipped} row(s) (no matching UUID).` : ""}`,
        );
        await fetchExistingTracks();
      } catch (err) {
        console.error("Excel upload error:", err);
        alert("Error reading/processing Excel: " + err.message);
      } finally {
        setBulkUpdating(false);
        if (excelFileInputRef.current) excelFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const pwd = passwordInput.trim();
    setPasswordInput("");
    try {
      const settings = await getAdminSettings();
      if (pwd === settings.adminPassword) {
        const token = await createAdminSession(settings.sessionTimeoutMinutes);
        sessionStorage.setItem("adminSessionToken", token);
        setIsAuthenticated(true);
        setPasswordError("");
        setSessionExpiredMessage("");
        fetchExistingTracks();
      } else {
        setPasswordError("Incorrect password. Please try again.");
      }
    } catch (err) {
      setPasswordError("Failed to verify. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-password-overlay">
          <div className="admin-password-modal">
            <div className="admin-password-header">
              <h2>
                <Lock size={24} className="admin-icon-inline" /> Admin Access
                Required
              </h2>
              <p>Please enter the password to access the admin panel</p>
            </div>
            <form
              onSubmit={handlePasswordSubmit}
              className="admin-password-form"
            >
              {sessionExpiredMessage && (
                <p className="admin-password-session-expired">
                  {sessionExpiredMessage}
                </p>
              )}
              <div className="admin-password-input-group">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                    setSessionExpiredMessage("");
                  }}
                  placeholder="Enter password"
                  className="admin-password-input"
                  autoFocus
                />
                {passwordError && (
                  <div className="admin-password-error">{passwordError}</div>
                )}
              </div>
              <button type="submit" className="admin-password-submit-btn">
                Access Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const filteredTracks = existingTracks.filter((track) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.name?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query) ||
      track.uuid?.toLowerCase().includes(query)
    );
  });

  const sortTracks = (tracks) => {
    if (!sortBy) return tracks;
    return [...tracks].sort((a, b) => {
      if (sortBy === "releaseDate") {
        const aVal = a.releaseDate || "";
        const bVal = b.releaseDate || "";
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (sortBy === "playCount") {
        const aVal = playCounts[a.uuid] ?? 0;
        const bVal = playCounts[b.uuid] ?? 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      // uploadedAt: Firestore Timestamp or number
      const getTime = (t) => {
        const ts = t.uploadedAt;
        if (!ts) return 0;
        if (typeof ts?.toMillis === "function") return ts.toMillis();
        if (typeof ts?.seconds === "number") return ts.seconds * 1000;
        if (typeof ts === "number") return ts;
        return 0;
      };
      const aVal = getTime(a);
      const bVal = getTime(b);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  const sortedFilteredTracks = sortTracks(filteredTracks);
  const sortedExistingTracks = sortTracks(existingTracks);

  const bulkFilteredTracks = existingTracks.filter((track) => {
    if (!bulkSearchQuery.trim()) return true;
    const query = bulkSearchQuery.toLowerCase();
    return (
      track.name?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query) ||
      track.uuid?.toLowerCase().includes(query)
    );
  });
  const sortedBulkTracks = sortTracks(bulkFilteredTracks);

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    if (activeTab === "hip") setBulkCurrentPage(1);
  };

  const sortOptions = [
    {
      field: "releaseDate",
      order: "asc",
      label: "Release Date (Oldest first)",
    },
    {
      field: "releaseDate",
      order: "desc",
      label: "Release Date (Newest first)",
    },
    { field: "uploadedAt", order: "asc", label: "Upload Date (Oldest first)" },
    { field: "uploadedAt", order: "desc", label: "Upload Date (Newest first)" },
    {
      field: "playCount",
      order: "desc",
      label: "Plays this week (Highest first)",
    },
    {
      field: "playCount",
      order: "asc",
      label: "Plays this week (Lowest first)",
    },
  ];

  const activeSortLabel =
    sortOptions.find((o) => o.field === sortBy && o.order === sortOrder)
      ?.label || "Sort by...";

  const sortDropdown = (
    <div className="admin-sort-dropdown" ref={sortDropdownRef}>
      <button
        type="button"
        className="admin-sort-dropdown-toggle"
        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
        aria-expanded={sortDropdownOpen}
      >
        <span>{activeSortLabel}</span>
        <span className="admin-sort-dropdown-arrow">
          {sortDropdownOpen ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </span>
      </button>
      {sortDropdownOpen && (
        <div className="admin-sort-dropdown-menu">
          {sortOptions.map((opt) => (
            <div
              key={`${opt.field}-${opt.order}`}
              className={`admin-sort-dropdown-item ${
                sortBy === opt.field && sortOrder === opt.order
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                handleSort(opt.field, opt.order);
                setSortDropdownOpen(false);
              }}
            >
              {opt.label}
              {opt.order === "asc" ? (
                <ArrowUp size={14} className="admin-sort-item-icon" />
              ) : (
                <ArrowDown size={14} className="admin-sort-item-icon" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h3>
          <Music size={28} className="admin-icon-inline" /> Music Upload Admin
          Panel
        </h3>
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
      </div>
      <div className="admin-tabs">
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab ${activeTab === "upload" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={18} className="admin-icon-inline" /> Manage Tracks
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "hip" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("hip")}
          >
            <FileSpreadsheet size={18} className="admin-icon-inline" /> Bulk
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "request" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("request")}
          >
            <MessageSquare size={18} className="admin-icon-inline" /> Request
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "feedback" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            <MessageSquare size={18} className="admin-icon-inline" /> Feedback
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "accounts" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("accounts")}
          >
            <Users size={18} className="admin-icon-inline" /> Accounts
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "listening" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("listening")}
          >
            <Headphones size={18} className="admin-icon-inline" /> Listening
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "playlist" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("playlist")}
            aria-label="Manage playlists"
          >
            <List size={18} className="admin-icon-inline" /> Playlist
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "story" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("story")}
            aria-label="Featured story overlay"
          >
            <BookOpen size={18} className="admin-icon-inline" /> Story
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "settings" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={18} className="admin-icon-inline" /> Settings
          </button>
        </div>
        <div className="admin-tab-content">
          {activeTab === "upload" && (
            <div>
              <form onSubmit={handleSubmit} className="admin-upload-form">
                <div className="admin-form-section">
                  <h2>
                    <FolderOpen size={22} className="admin-icon-inline" /> Music
                    File
                  </h2>
                  <div className="admin-file-input-container">
                    <input
                      type="file"
                      id="musicFile"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="admin-file-input"
                      required={!editingTrackId}
                    />
                    <label
                      htmlFor="musicFile"
                      className="admin-file-input-label"
                    >
                      {musicFile
                        ? `Selected: ${musicFile.name}`
                        : editingTrackId
                          ? "Choose New Music File (Optional)"
                          : "Choose Music File"}
                    </label>
                  </div>
                </div>

                <div className="admin-form-section">
                  <h2>
                    <FileText size={22} className="admin-icon-inline" /> Track
                    Information
                  </h2>
                  <div className="admin-form-grid">
                    <div className="admin-form-group admin-uuid-group">
                      <label htmlFor="uuid">Track UUID (Auto-generated)</label>
                      <div className="admin-uuid-input-wrapper">
                        <input
                          type="text"
                          id="uuid"
                          name="uuid"
                          value={trackUUID}
                          readOnly
                          className="admin-uuid-input"
                          title="Unique identifier for this track (auto-generated)"
                        />
                        <button
                          type="button"
                          onClick={() => setTrackUUID(generateUUID())}
                          className="admin-regenerate-uuid-btn"
                          title="Generate new UUID"
                        >
                          <RefreshCw size={16} className="admin-icon-inline" />{" "}
                          Regenerate
                        </button>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="name">Track Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter track name"
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label
                        htmlFor="artist"
                        onClick={
                          isOtherArtist ? resetArtistToDropdown : undefined
                        }
                        className={isOtherArtist ? "admin-clickable-label" : ""}
                        title={
                          isOtherArtist
                            ? "Click to switch back to dropdown"
                            : ""
                        }
                      >
                        Artist * {isOtherArtist && "← Click to go back"}
                      </label>
                      {isOtherArtist ? (
                        <input
                          type="text"
                          id="artist"
                          name="artist"
                          value={customArtist}
                          onChange={(e) => setCustomArtist(e.target.value)}
                          placeholder="Enter custom artist name"
                          required
                        />
                      ) : (
                        <CustomDropdown
                          value={formData.artist}
                          options={artists}
                          onChange={handleArtistChange}
                          placeholder="Select Artist"
                          onOtherSelect={() => {
                            setIsOtherArtist(true);
                            setFormData((prev) => ({ ...prev, artist: "" }));
                          }}
                          isOpen={artistDropdownOpen}
                          setIsOpen={setArtistDropdownOpen}
                          searchable
                        />
                      )}
                    </div>

                    <div className="admin-form-group">
                      <label
                        htmlFor="genre"
                        onClick={
                          isOtherGenre ? resetGenreToDropdown : undefined
                        }
                        className={isOtherGenre ? "admin-clickable-label" : ""}
                        title={
                          isOtherGenre ? "Click to switch back to dropdown" : ""
                        }
                      >
                        Genre * {isOtherGenre && "← Click to go back"}
                      </label>
                      {isOtherGenre ? (
                        <input
                          type="text"
                          id="genre"
                          name="genre"
                          value={customGenre}
                          onChange={(e) => setCustomGenre(e.target.value)}
                          placeholder="Enter custom genre"
                          required
                        />
                      ) : (
                        <CustomDropdown
                          value={formData.genre}
                          options={genres}
                          onChange={handleGenreChange}
                          placeholder="Select Genre"
                          onOtherSelect={() => {
                            setIsOtherGenre(true);
                            setFormData((prev) => ({ ...prev, genre: "" }));
                          }}
                          isOpen={genreDropdownOpen}
                          setIsOpen={setGenreDropdownOpen}
                        />
                      )}
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="album">Album *</label>
                      <input
                        type="text"
                        id="album"
                        name="album"
                        value={formData.album}
                        onChange={handleInputChange}
                        placeholder="Enter album name"
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="releaseDate">Release Date *</label>
                      <input
                        type="date"
                        id="releaseDate"
                        name="releaseDate"
                        value={formData.releaseDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {uploading && (
                  <div className="admin-upload-progress">
                    <div className="admin-progress-bar">
                      <div
                        className="admin-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p>Uploading... {uploadProgress}%</p>
                  </div>
                )}

                <div className="admin-form-actions">
                  <button
                    type="submit"
                    className="admin-upload-button"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw size={16} className="admin-icon-inline" />{" "}
                        Uploading...
                      </>
                    ) : editingTrackId ? (
                      <>
                        <Save size={16} className="admin-icon-inline" /> Update
                        Track
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="admin-icon-inline" />{" "}
                        Upload Music
                      </>
                    )}
                  </button>
                  {editingTrackId && (
                    <button
                      type="button"
                      className="admin-cancel-button"
                      onClick={handleCancelEdit}
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="admin-tracks-section">
                <h2>
                  <List size={22} className="admin-icon-inline" /> Existing
                  Tracks
                </h2>
                {loadingTracks ? (
                  <div className="admin-loading-tracks">Loading tracks...</div>
                ) : (
                  <>
                    <div className="admin-tracks-count-container">
                      <span className="admin-tracks-count">
                        Total: <strong>{existingTracks.length}</strong>
                        {searchQuery.trim() && (
                          <>
                            {" | "}
                            Showing: <strong>{filteredTracks.length}</strong>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="admin-search-sort-row">
                      <div className="admin-search-container">
                        <input
                          type="text"
                          placeholder="Search tracks by name, artist, genre, album..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="admin-search-input"
                        />
                      </div>
                      {sortDropdown}
                    </div>
                    {existingTracks.length === 0 ? (
                      <div className="admin-no-tracks">
                        No tracks uploaded yet.
                      </div>
                    ) : (
                      <div className="admin-tracks-list-container">
                        <div className="admin-tracks-list">
                          {sortedFilteredTracks.map((track) => (
                            <div key={track.id} className="admin-track-item">
                              <div className="admin-track-item-info">
                                <h3>{track.name}</h3>
                                <p>
                                  <strong>Artist:</strong> {track.artist} |{" "}
                                  <strong>Genre:</strong> {track.genre} |{" "}
                                  <strong>Album:</strong> {track.album}
                                </p>
                                <p>
                                  <strong>Release Date:</strong>{" "}
                                  {track.releaseDate} | <strong>UUID:</strong>{" "}
                                  {track.uuid || "N/A"}
                                </p>
                              </div>
                              <div className="admin-track-item-actions">
                                <button
                                  className="admin-edit-button"
                                  onClick={() => handleEdit(track)}
                                  disabled={uploading}
                                >
                                  <Pencil
                                    size={14}
                                    className="admin-icon-inline"
                                  />{" "}
                                  Edit
                                </button>
                                <button
                                  className="admin-delete-button"
                                  onClick={() => handleDelete(track.id)}
                                  disabled={uploading}
                                >
                                  <Trash2
                                    size={14}
                                    className="admin-icon-inline"
                                  />{" "}
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {activeTab === "hip" && (
            <div className="admin-hip-tab">
              <div className="admin-bulk-header">
                <h2>
                  <FileSpreadsheet size={22} className="admin-icon-inline" />{" "}
                  Bulk Edit Tracks
                </h2>
                <p className="admin-bulk-subtitle">
                  Edit metadata below. Track files cannot be changed here.
                  Download Excel to edit offline, then upload to apply changes.
                </p>
                <div className="admin-search-sort-row">
                  <div className="admin-search-container">
                    <input
                      type="text"
                      placeholder="Search tracks by name, artist, genre, album, UUID..."
                      value={bulkSearchQuery}
                      onChange={(e) => {
                        setBulkSearchQuery(e.target.value);
                        setBulkCurrentPage(1);
                      }}
                      className="admin-search-input"
                      aria-label="Search tracks"
                    />
                  </div>
                  {sortDropdown}
                </div>
                <div className="admin-bulk-actions">
                  <button
                    type="button"
                    className="admin-bulk-excel-btn admin-bulk-download-btn"
                    onClick={handleExcelDownload}
                    disabled={existingTracks.length === 0}
                  >
                    <Download size={18} className="admin-icon-inline" />{" "}
                    Download Excel
                  </button>
                  <button
                    type="button"
                    className="admin-bulk-excel-btn admin-bulk-upload-btn"
                    onClick={() => excelFileInputRef.current?.click()}
                    disabled={existingTracks.length === 0 || bulkUpdating}
                  >
                    <FileUp size={18} className="admin-icon-inline" /> Upload
                    Excel
                  </button>
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="admin-bulk-file-input"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="admin-bulk-update-btn"
                    onClick={handleBulkUpdate}
                    disabled={
                      bulkUpdating ||
                      loadingTracks ||
                      bulkSelectedIds.size === 0
                    }
                  >
                    {bulkUpdating ? (
                      <>
                        <RefreshCw
                          size={18}
                          className="admin-icon-inline admin-spin"
                        />{" "}
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="admin-icon-inline" /> Update
                        ({bulkSelectedIds.size}) Record
                        {bulkSelectedIds.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
              {loadingTracks ? (
                <div className="admin-loading-tracks">Loading tracks...</div>
              ) : existingTracks.length === 0 ? (
                <div className="admin-no-tracks">No tracks to edit.</div>
              ) : bulkFilteredTracks.length === 0 ? (
                <div className="admin-no-tracks">
                  No tracks match your search.
                </div>
              ) : (
                <>
                  <div className="admin-bulk-table-wrapper">
                    <table className="admin-bulk-table">
                      <thead>
                        <tr>
                          <th className="admin-bulk-th admin-bulk-th-check">
                            <input
                              type="checkbox"
                              checked={(() => {
                                const start =
                                  (bulkCurrentPage - 1) * BULK_RECORDS_PER_PAGE;
                                const paginated = sortedBulkTracks.slice(
                                  start,
                                  start + BULK_RECORDS_PER_PAGE,
                                );
                                return (
                                  paginated.length > 0 &&
                                  paginated.every((t) =>
                                    bulkSelectedIds.has(t.id),
                                  )
                                );
                              })()}
                              onChange={() => {
                                const start =
                                  (bulkCurrentPage - 1) * BULK_RECORDS_PER_PAGE;
                                const paginated = sortedBulkTracks.slice(
                                  start,
                                  start + BULK_RECORDS_PER_PAGE,
                                );
                                toggleBulkSelectAll(paginated);
                              }}
                              className="admin-bulk-checkbox"
                              title="Select all on page"
                            />
                          </th>
                          <th className="admin-bulk-th admin-bulk-th-num">#</th>
                          <th className="admin-bulk-th">Track Name</th>
                          <th className="admin-bulk-th">Artist</th>
                          <th className="admin-bulk-th">Genre</th>
                          <th className="admin-bulk-th">Album</th>
                          <th className="admin-bulk-th">Release Date</th>
                          <th className="admin-bulk-th admin-bulk-th-plays">
                            Plays (Week)
                          </th>
                          <th className="admin-bulk-th admin-bulk-th-uuid">
                            UUID
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const start =
                            (bulkCurrentPage - 1) * BULK_RECORDS_PER_PAGE;
                          const paginatedTracks = sortedBulkTracks.slice(
                            start,
                            start + BULK_RECORDS_PER_PAGE,
                          );
                          return paginatedTracks.map((track, idx) => {
                            const rowNum = start + idx + 1;
                            const data = bulkEditData[track.id] || {
                              name: track.name || "",
                              artist: track.artist || "",
                              genre: track.genre || "",
                              album: track.album || "",
                              releaseDate: track.releaseDate || "",
                            };
                            return (
                              <tr key={track.id} className="admin-bulk-tr">
                                <td className="admin-bulk-td admin-bulk-td-check">
                                  <input
                                    type="checkbox"
                                    checked={bulkSelectedIds.has(track.id)}
                                    onChange={() => toggleBulkSelect(track.id)}
                                    className="admin-bulk-checkbox"
                                  />
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-num">
                                  {rowNum}
                                </td>
                                <td className="admin-bulk-td">
                                  <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) =>
                                      handleBulkFieldChange(
                                        track.id,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    className="admin-bulk-input"
                                  />
                                </td>
                                <td className="admin-bulk-td">
                                  <input
                                    type="text"
                                    value={data.artist}
                                    onChange={(e) =>
                                      handleBulkFieldChange(
                                        track.id,
                                        "artist",
                                        e.target.value,
                                      )
                                    }
                                    className="admin-bulk-input"
                                  />
                                </td>
                                <td className="admin-bulk-td">
                                  <input
                                    type="text"
                                    value={data.genre}
                                    onChange={(e) =>
                                      handleBulkFieldChange(
                                        track.id,
                                        "genre",
                                        e.target.value,
                                      )
                                    }
                                    className="admin-bulk-input"
                                  />
                                </td>
                                <td className="admin-bulk-td">
                                  <input
                                    type="text"
                                    value={data.album}
                                    onChange={(e) =>
                                      handleBulkFieldChange(
                                        track.id,
                                        "album",
                                        e.target.value,
                                      )
                                    }
                                    className="admin-bulk-input"
                                  />
                                </td>
                                <td className="admin-bulk-td">
                                  <input
                                    type="date"
                                    value={data.releaseDate}
                                    onChange={(e) =>
                                      handleBulkFieldChange(
                                        track.id,
                                        "releaseDate",
                                        e.target.value,
                                      )
                                    }
                                    className="admin-bulk-input"
                                  />
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-plays">
                                  {playCounts[track.uuid] ?? 0}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-uuid">
                                  {track.uuid || "N/A"}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {bulkFilteredTracks.length > BULK_RECORDS_PER_PAGE && (
                    <div className="admin-bulk-pagination">
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setBulkCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={bulkCurrentPage <= 1}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="admin-bulk-page-info">
                        Page {bulkCurrentPage} of{" "}
                        {Math.ceil(
                          bulkFilteredTracks.length / BULK_RECORDS_PER_PAGE,
                        )}{" "}
                        ({bulkFilteredTracks.length} total
                        {bulkSearchQuery.trim() ? " matching" : ""})
                      </span>
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setBulkCurrentPage((p) =>
                            Math.min(
                              Math.ceil(
                                bulkFilteredTracks.length /
                                  BULK_RECORDS_PER_PAGE,
                              ),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          bulkCurrentPage >=
                          Math.ceil(
                            bulkFilteredTracks.length / BULK_RECORDS_PER_PAGE,
                          )
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === "request" && (
            <div className="admin-hip-tab admin-request-tab">
              <div className="admin-bulk-header">
                <h2>
                  <MessageSquare size={22} className="admin-icon-inline" /> Song
                  Requests
                </h2>
                <p className="admin-bulk-subtitle">
                  User-submitted song requests.
                </p>
              </div>
              {loadingRequests ? (
                <div className="admin-loading-requests">
                  <p>Loading requests...</p>
                </div>
              ) : songRequests.length === 0 ? (
                <div className="admin-empty-requests">
                  <p>No song requests yet.</p>
                </div>
              ) : (
                <>
                  <div className="admin-bulk-table-wrapper">
                    <table className="admin-bulk-table admin-request-table">
                      <thead>
                        <tr>
                          <th className="admin-bulk-th admin-bulk-th-num">#</th>
                          <th className="admin-bulk-th">Song Name</th>
                          <th className="admin-bulk-th">Album</th>
                          <th className="admin-bulk-th">Requested By</th>
                          <th className="admin-bulk-th">Email</th>
                          <th className="admin-bulk-th">Contact</th>
                          <th className="admin-bulk-th">Date</th>
                          <th className="admin-bulk-th admin-bulk-th-action"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const start =
                            (requestCurrentPage - 1) * REQUEST_RECORDS_PER_PAGE;
                          const paginatedRequests = songRequests.slice(
                            start,
                            start + REQUEST_RECORDS_PER_PAGE,
                          );
                          return paginatedRequests.map((req, idx) => {
                            const rowNum = start + idx + 1;
                            const createdAt = req.createdAt;
                            let dateStr = "—";
                            if (createdAt) {
                              if (createdAt.toDate) {
                                dateStr = createdAt.toDate().toLocaleString();
                              } else if (typeof createdAt === "string") {
                                dateStr = new Date(createdAt).toLocaleString();
                              }
                            }
                            return (
                              <tr key={req.id} className="admin-bulk-tr">
                                <td className="admin-bulk-td admin-bulk-td-num">
                                  {rowNum}
                                </td>
                                <td className="admin-bulk-td">
                                  {req.songName}
                                </td>
                                <td className="admin-bulk-td">{req.album}</td>
                                <td className="admin-bulk-td">
                                  {req.userName}
                                </td>
                                <td className="admin-bulk-td">
                                  {req.email ? (
                                    <a
                                      href={`mailto:${req.email}`}
                                      className="admin-request-contact-link"
                                    >
                                      {req.email}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="admin-bulk-td">
                                  {req.contactNumber ? (
                                    <a
                                      href={`tel:${req.contactNumber}`}
                                      className="admin-request-contact-link"
                                    >
                                      {req.contactNumber}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-date">
                                  {dateStr}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-action">
                                  <button
                                    type="button"
                                    className="admin-request-clear-btn"
                                    onClick={() => handleClearRequest(req)}
                                    disabled={clearingRequestId === req.id}
                                    title="Mark as done & notify user"
                                    aria-label="Clear request"
                                  >
                                    <Check size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {songRequests.length > REQUEST_RECORDS_PER_PAGE && (
                    <div className="admin-bulk-pagination">
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setRequestCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={requestCurrentPage <= 1}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="admin-bulk-page-info">
                        Page {requestCurrentPage} of{" "}
                        {Math.ceil(
                          songRequests.length / REQUEST_RECORDS_PER_PAGE,
                        )}{" "}
                        ({songRequests.length} total)
                      </span>
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setRequestCurrentPage((p) =>
                            Math.min(
                              Math.ceil(
                                songRequests.length / REQUEST_RECORDS_PER_PAGE,
                              ),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          requestCurrentPage >=
                          Math.ceil(
                            songRequests.length / REQUEST_RECORDS_PER_PAGE,
                          )
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === "feedback" && (
            <div className="admin-hip-tab admin-feedback-tab">
              <div className="admin-bulk-header admin-feedback-header">
                <div>
                  <h2>
                    <MessageSquare size={22} className="admin-icon-inline" />{" "}
                    Feedback
                  </h2>
                  <p className="admin-bulk-subtitle">
                    User-submitted feedback.
                  </p>
                </div>
                {feedbackList.length > 0 && (
                  <button
                    type="button"
                    className="admin-feedback-clear-all-btn"
                    onClick={handleClearAllFeedback}
                    disabled={clearingAllFeedback}
                    title="Delete all feedback"
                  >
                    <Trash2 size={16} className="admin-icon-inline" />
                    {clearingAllFeedback ? "Clearing…" : "Clear all"}
                  </button>
                )}
              </div>
              {loadingFeedback ? (
                <div className="admin-loading-requests">
                  <p>Loading feedback...</p>
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="admin-empty-requests">
                  <p>No feedback yet.</p>
                </div>
              ) : (
                <>
                  <div className="admin-bulk-table-wrapper">
                    <table className="admin-bulk-table admin-request-table">
                      <thead>
                        <tr>
                          <th className="admin-bulk-th admin-bulk-th-num">#</th>
                          <th className="admin-bulk-th">Name</th>
                          <th className="admin-bulk-th">Email</th>
                          <th className="admin-bulk-th">Contact</th>
                          <th className="admin-bulk-th">Message</th>
                          <th className="admin-bulk-th">Date</th>
                          <th className="admin-bulk-th admin-bulk-th-action"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const start =
                            (feedbackCurrentPage - 1) *
                            FEEDBACK_RECORDS_PER_PAGE;
                          const paginated = feedbackList.slice(
                            start,
                            start + FEEDBACK_RECORDS_PER_PAGE,
                          );
                          return paginated.map((fb, idx) => {
                            const rowNum = start + idx + 1;
                            const createdAt = fb.createdAt;
                            let dateStr = "—";
                            if (createdAt) {
                              if (createdAt.toDate) {
                                dateStr = createdAt.toDate().toLocaleString();
                              } else if (typeof createdAt === "string") {
                                dateStr = new Date(createdAt).toLocaleString();
                              }
                            }
                            return (
                              <tr key={fb.id} className="admin-bulk-tr">
                                <td className="admin-bulk-td admin-bulk-td-num">
                                  {rowNum}
                                </td>
                                <td className="admin-bulk-td">
                                  {fb.userName || "—"}
                                </td>
                                <td className="admin-bulk-td">
                                  {fb.email ? (
                                    <a
                                      href={`mailto:${fb.email}`}
                                      className="admin-request-contact-link"
                                    >
                                      {fb.email}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="admin-bulk-td">
                                  {fb.contactNumber ? (
                                    <a
                                      href={`tel:${fb.contactNumber}`}
                                      className="admin-request-contact-link"
                                    >
                                      {fb.contactNumber}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-message">
                                  {fb.message || "—"}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-date">
                                  {dateStr}
                                </td>
                                <td className="admin-bulk-td admin-bulk-td-action">
                                  <button
                                    type="button"
                                    className="admin-request-clear-btn admin-account-delete-btn"
                                    onClick={() => handleDeleteFeedback(fb.id)}
                                    disabled={deletingFeedbackId === fb.id}
                                    title="Delete feedback"
                                    aria-label="Delete feedback"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {feedbackList.length > FEEDBACK_RECORDS_PER_PAGE && (
                    <div className="admin-bulk-pagination">
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setFeedbackCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={feedbackCurrentPage <= 1}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="admin-bulk-page-info">
                        Page {feedbackCurrentPage} of{" "}
                        {Math.ceil(
                          feedbackList.length / FEEDBACK_RECORDS_PER_PAGE,
                        )}{" "}
                        ({feedbackList.length} total)
                      </span>
                      <button
                        type="button"
                        className="admin-bulk-page-btn"
                        onClick={() =>
                          setFeedbackCurrentPage((p) =>
                            Math.min(
                              Math.ceil(
                                feedbackList.length / FEEDBACK_RECORDS_PER_PAGE,
                              ),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          feedbackCurrentPage >=
                          Math.ceil(
                            feedbackList.length / FEEDBACK_RECORDS_PER_PAGE,
                          )
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === "accounts" && (
            <div className="admin-hip-tab admin-accounts-tab">
              <div className="admin-bulk-header">
                <h2>
                  <Users size={22} className="admin-icon-inline" /> Accounts
                </h2>
                <p className="admin-bulk-subtitle">
                  All created user accounts.
                </p>
                <div className="admin-accounts-toolbar">
                  <div className="admin-search-container admin-accounts-search">
                    <Search size={18} className="admin-search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, email..."
                      value={accountsSearchQuery}
                      onChange={(e) => {
                        setAccountsSearchQuery(e.target.value);
                        setAccountsCurrentPage(1);
                      }}
                      className="admin-search-input"
                      aria-label="Search accounts"
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-accounts-send-all-btn"
                    onClick={() => {
                      const q = accountsSearchQuery.trim().toLowerCase();
                      const filtered = q
                        ? accounts.filter(
                            (a) =>
                              (a.name || "").toLowerCase().includes(q) ||
                              (a.email || "").toLowerCase().includes(q) ||
                              (a.uuid || "").toLowerCase().includes(q),
                          )
                        : accounts;
                      if (filtered.length === 0) return;
                      handleOpenMessageModalAll(filtered);
                    }}
                    disabled={accounts.length === 0}
                    title="Send message to all (filtered) users"
                  >
                    <MessageSquare size={18} />
                    Send to all
                  </button>
                </div>
              </div>
              {loadingAccounts ? (
                <div className="admin-loading-requests">
                  <p>Loading accounts...</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="admin-empty-requests">
                  <p>No accounts yet.</p>
                </div>
              ) : (
                (() => {
                  const q = accountsSearchQuery.trim().toLowerCase();
                  const filteredAccounts = q
                    ? accounts.filter(
                        (a) =>
                          (a.name || "").toLowerCase().includes(q) ||
                          (a.email || "").toLowerCase().includes(q) ||
                          (a.uuid || "").toLowerCase().includes(q),
                      )
                    : accounts;
                  return filteredAccounts.length === 0 ? (
                    <div className="admin-empty-requests">
                      <p>No accounts match your search.</p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-bulk-table-wrapper">
                        <table className="admin-bulk-table admin-request-table">
                          <thead>
                            <tr>
                              <th className="admin-bulk-th admin-bulk-th-num">
                                #
                              </th>
                              <th className="admin-bulk-th">Name</th>
                              <th className="admin-bulk-th">Email</th>
                              <th className="admin-bulk-th admin-bulk-th-uuid">
                                UUID
                              </th>
                              <th className="admin-bulk-th">Created</th>
                              <th className="admin-bulk-th admin-bulk-th-action"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const q = accountsSearchQuery
                                .trim()
                                .toLowerCase();
                              const filteredAccounts = q
                                ? accounts.filter(
                                    (a) =>
                                      (a.name || "")
                                        .toLowerCase()
                                        .includes(q) ||
                                      (a.email || "")
                                        .toLowerCase()
                                        .includes(q) ||
                                      (a.uuid || "").toLowerCase().includes(q),
                                  )
                                : accounts;
                              const start =
                                (accountsCurrentPage - 1) *
                                ACCOUNTS_RECORDS_PER_PAGE;
                              const paginatedAccounts = filteredAccounts.slice(
                                start,
                                start + ACCOUNTS_RECORDS_PER_PAGE,
                              );
                              return paginatedAccounts.map((acc, idx) => {
                                const rowNum = start + idx + 1;
                                const createdAt = acc.createdAt;
                                let dateStr = "—";
                                if (createdAt) {
                                  if (createdAt.toDate) {
                                    dateStr = createdAt
                                      .toDate()
                                      .toLocaleString();
                                  } else if (typeof createdAt === "string") {
                                    dateStr = new Date(
                                      createdAt,
                                    ).toLocaleString();
                                  }
                                }
                                return (
                                  <tr key={acc.id} className="admin-bulk-tr">
                                    <td className="admin-bulk-td admin-bulk-td-num">
                                      {rowNum}
                                    </td>
                                    <td className="admin-bulk-td admin-bulk-td-name">
                                      <span className="admin-account-name-cell">
                                        {acc.name}
                                        <button
                                          type="button"
                                          className="admin-account-message-btn"
                                          onClick={() =>
                                            handleOpenMessageModal(acc)
                                          }
                                          title="Send message"
                                          aria-label="Send message"
                                        >
                                          <MessageSquare size={16} />
                                        </button>
                                      </span>
                                    </td>
                                    <td className="admin-bulk-td">
                                      {acc.email ? (
                                        <a
                                          href={`mailto:${acc.email}`}
                                          className="admin-request-contact-link"
                                        >
                                          {acc.email}
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="admin-bulk-td admin-bulk-td-uuid">
                                      {acc.uuid || "—"}
                                    </td>
                                    <td className="admin-bulk-td admin-bulk-td-date">
                                      {dateStr}
                                    </td>
                                    <td className="admin-bulk-td admin-bulk-td-action">
                                      <button
                                        type="button"
                                        className="admin-request-clear-btn admin-account-delete-btn"
                                        onClick={() =>
                                          handleDeleteAccount(acc.id)
                                        }
                                        disabled={deletingAccountId === acc.id}
                                        title="Delete account"
                                        aria-label="Delete account"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const q = accountsSearchQuery.trim().toLowerCase();
                        const filteredAccounts = q
                          ? accounts.filter(
                              (a) =>
                                (a.name || "").toLowerCase().includes(q) ||
                                (a.email || "").toLowerCase().includes(q) ||
                                (a.uuid || "").toLowerCase().includes(q),
                            )
                          : accounts;
                        return filteredAccounts.length >
                          ACCOUNTS_RECORDS_PER_PAGE ? (
                          <div className="admin-bulk-pagination">
                            <button
                              type="button"
                              className="admin-bulk-page-btn"
                              onClick={() =>
                                setAccountsCurrentPage((p) =>
                                  Math.max(1, p - 1),
                                )
                              }
                              disabled={accountsCurrentPage <= 1}
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <span className="admin-bulk-page-info">
                              Page {accountsCurrentPage} of{" "}
                              {Math.ceil(
                                filteredAccounts.length /
                                  ACCOUNTS_RECORDS_PER_PAGE,
                              )}{" "}
                              ({filteredAccounts.length} total
                              {q ? " matching" : ""})
                            </span>
                            <button
                              type="button"
                              className="admin-bulk-page-btn"
                              onClick={() =>
                                setAccountsCurrentPage((p) =>
                                  Math.min(
                                    Math.ceil(
                                      filteredAccounts.length /
                                        ACCOUNTS_RECORDS_PER_PAGE,
                                    ),
                                    p + 1,
                                  ),
                                )
                              }
                              disabled={
                                accountsCurrentPage >=
                                Math.ceil(
                                  filteredAccounts.length /
                                    ACCOUNTS_RECORDS_PER_PAGE,
                                )
                              }
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </>
                  );
                })()
              )}
            </div>
          )}
          {activeTab === "listening" && (
            <div className="admin-hip-tab admin-listening-tab">
              <div className="admin-bulk-header">
                <h2>
                  <Headphones size={22} className="admin-icon-inline" /> User
                  Listening Activity
                </h2>
                <p className="admin-bulk-subtitle">
                  Last 50 listened songs and top 3 artists per user (logged-in
                  only).
                </p>
                <div className="admin-search-sort-row admin-listening-search-row">
                  <div className="admin-search-container">
                    <Search size={18} className="admin-search-icon" />
                    <input
                      type="text"
                      placeholder="Search by user name..."
                      value={listeningStatsSearchQuery}
                      onChange={(e) => {
                        setListeningStatsSearchQuery(e.target.value);
                        setListeningStatsCurrentPage(1);
                      }}
                      className="admin-search-input"
                      aria-label="Search users"
                    />
                  </div>
                </div>
              </div>
              {loadingListeningStats ? (
                <div className="admin-loading-requests">
                  <p>Loading listening stats...</p>
                </div>
              ) : listeningStats.length === 0 ? (
                <div className="admin-empty-requests">
                  <p>
                    No listening data yet. Users must be logged in and play
                    songs for stats to appear.
                  </p>
                </div>
              ) : (
                (() => {
                  const q = listeningStatsSearchQuery.trim().toLowerCase();
                  const filtered = q
                    ? listeningStats.filter((s) =>
                        (s.userName || "").toLowerCase().includes(q),
                      )
                    : listeningStats;
                  return filtered.length === 0 ? (
                    <div className="admin-empty-requests">
                      <p>No users match your search.</p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-listening-charts">
                        <div className="admin-listening-chart-tabs-wrap">
                          {isAdminMobile ? (
                            <div
                              className="admin-listening-chart-dropdown"
                              ref={listeningChartDropdownRef}
                            >
                              <button
                                type="button"
                                className="admin-listening-chart-dropdown-toggle"
                                onClick={() =>
                                  setListeningChartDropdownOpen(
                                    !listeningChartDropdownOpen,
                                  )
                                }
                                aria-expanded={listeningChartDropdownOpen}
                              >
                                <span>
                                  {listeningChartTab === "bar"
                                    ? "Top Artists (Bar)"
                                    : listeningChartTab === "pie"
                                      ? "Top Artists (Pie)"
                                      : "Top 10 Songs of the Week"}
                                </span>
                                <span className="admin-listening-chart-dropdown-arrow">
                                  {listeningChartDropdownOpen ? (
                                    <ChevronUp size={18} />
                                  ) : (
                                    <ChevronDown size={18} />
                                  )}
                                </span>
                              </button>
                              {listeningChartDropdownOpen && (
                                <div className="admin-listening-chart-dropdown-menu">
                                  {[
                                    {
                                      id: "bar",
                                      label: "Top Artists (Bar)",
                                    },
                                    {
                                      id: "pie",
                                      label: "Top Artists (Pie)",
                                    },
                                    {
                                      id: "songs",
                                      label: "Top 10 Songs of the Week",
                                    },
                                  ].map((opt) => (
                                    <div
                                      key={opt.id}
                                      className={`admin-listening-chart-dropdown-item ${
                                        listeningChartTab === opt.id
                                          ? "admin-listening-chart-dropdown-item--active"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        setListeningChartTab(opt.id);
                                        setListeningChartDropdownOpen(false);
                                      }}
                                    >
                                      {opt.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="admin-listening-chart-tabs">
                              <button
                                type="button"
                                className={`admin-listening-chart-tab ${listeningChartTab === "bar" ? "admin-listening-chart-tab--active" : ""}`}
                                onClick={() => setListeningChartTab("bar")}
                              >
                                Top Artists (Bar)
                              </button>
                              <button
                                type="button"
                                className={`admin-listening-chart-tab ${listeningChartTab === "pie" ? "admin-listening-chart-tab--active" : ""}`}
                                onClick={() => setListeningChartTab("pie")}
                              >
                                Top Artists (Pie)
                              </button>
                              <button
                                type="button"
                                className={`admin-listening-chart-tab ${listeningChartTab === "songs" ? "admin-listening-chart-tab--active" : ""}`}
                                onClick={() => setListeningChartTab("songs")}
                              >
                                Top 10 Songs of the Week
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="admin-listening-chart-panel">
                          {listeningChartTab === "songs"
                            ? (() => {
                                const uuidToName = {};
                                existingTracks.forEach((t) => {
                                  if (t.uuid)
                                    uuidToName[t.uuid] = t.name || "Unknown";
                                });
                                const songData = Object.entries(playCounts)
                                  .map(([uuid, count]) => ({
                                    name:
                                      uuidToName[uuid] ||
                                      `Track ${uuid.slice(0, 8)}...`,
                                    count,
                                  }))
                                  .sort((a, b) => b.count - a.count)
                                  .slice(0, 10);
                                const maxCount = Math.max(
                                  ...songData.map((d) => d.count),
                                  1,
                                );
                                const SONG_BAR_COLORS = [
                                  "#a78bfa",
                                  "#2dd4bf",
                                  "#fbbf24",
                                  "#f472b6",
                                  "#60a5fa",
                                  "#34d399",
                                  "#c084fc",
                                  "#38bdf8",
                                  "#f97316",
                                  "#a3e635",
                                ];
                                return songData.length === 0 ? (
                                  <div className="admin-listening-chart-empty-wrapper">
                                    <p className="admin-listening-chart-empty">
                                      No play data yet. Songs will appear after
                                      users play them.
                                    </p>
                                    <p className="admin-listening-chart-empty-hint">
                                      Clear counts to start a new week.
                                    </p>
                                    <ClearWeeklyCountsButton
                                      onClear={loadPlayCounts}
                                      disabled={
                                        Object.keys(playCounts).length === 0
                                      }
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="admin-listening-songs-chart-header">
                                      <h4 className="admin-listening-songs-chart-title">
                                        Top 10 Songs of the Week on Beatify
                                      </h4>
                                      <ClearWeeklyCountsButton
                                        onClear={loadPlayCounts}
                                      />
                                    </div>
                                    <div className="admin-listening-bar-chart">
                                      {songData.map((d, i) => (
                                        <div
                                          key={d.name + i}
                                          className="admin-listening-bar-row"
                                        >
                                          <span className="admin-listening-bar-label">
                                            {d.name}
                                          </span>
                                          <div className="admin-listening-bar-wrap">
                                            <div
                                              className="admin-listening-bar-fill"
                                              style={{
                                                width: `${(d.count / maxCount) * 100}%`,
                                                backgroundColor:
                                                  SONG_BAR_COLORS[
                                                    i % SONG_BAR_COLORS.length
                                                  ],
                                              }}
                                            />
                                          </div>
                                          <span className="admin-listening-bar-value">
                                            {d.count}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()
                            : listeningChartTab === "bar"
                              ? (() => {
                                  const artistMap = {};
                                  filtered.forEach((s) => {
                                    (s.top3Artists || []).forEach((a) => {
                                      artistMap[a.name] =
                                        (artistMap[a.name] || 0) +
                                        (a.count ?? 0);
                                    });
                                  });
                                  const artistData = Object.entries(artistMap)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 12)
                                    .map(([name, count]) => ({ name, count }));
                                  const maxCount = Math.max(
                                    ...artistData.map((d) => d.count),
                                    1,
                                  );
                                  const BAR_COLORS = [
                                    "#a78bfa",
                                    "#2dd4bf",
                                    "#fbbf24",
                                    "#f472b6",
                                    "#60a5fa",
                                    "#34d399",
                                    "#c084fc",
                                    "#38bdf8",
                                    "#f97316",
                                    "#a3e635",
                                    "#818cf8",
                                    "#f0abfc",
                                  ];
                                  return artistData.length === 0 ? (
                                    <p className="admin-listening-chart-empty">
                                      No artist data yet
                                    </p>
                                  ) : (
                                    <div className="admin-listening-bar-chart">
                                      {artistData.map((d, i) => (
                                        <div
                                          key={d.name}
                                          className="admin-listening-bar-row"
                                        >
                                          <span className="admin-listening-bar-label">
                                            {d.name}
                                          </span>
                                          <div className="admin-listening-bar-wrap">
                                            <div
                                              className="admin-listening-bar-fill"
                                              style={{
                                                width: `${(d.count / maxCount) * 100}%`,
                                                backgroundColor:
                                                  BAR_COLORS[
                                                    i % BAR_COLORS.length
                                                  ],
                                              }}
                                            />
                                          </div>
                                          <span className="admin-listening-bar-value">
                                            {d.count}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()
                              : (() => {
                                  const artistMap = {};
                                  filtered.forEach((s) => {
                                    (s.top3Artists || []).forEach((a) => {
                                      artistMap[a.name] =
                                        (artistMap[a.name] || 0) +
                                        (a.count ?? 0);
                                    });
                                  });
                                  const artistData = Object.entries(artistMap)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 10)
                                    .map(([name, count]) => ({ name, count }));
                                  const total = artistData.reduce(
                                    (a, d) => a + d.count,
                                    0,
                                  );
                                  const COLORS = [
                                    "#a78bfa",
                                    "#2dd4bf",
                                    "#fbbf24",
                                    "#f472b6",
                                    "#60a5fa",
                                    "#34d399",
                                    "#c084fc",
                                    "#38bdf8",
                                    "#f97316",
                                    "#a3e635",
                                  ];
                                  let acc = 0;
                                  return artistData.length === 0 ? (
                                    <p className="admin-listening-chart-empty">
                                      No artist data yet
                                    </p>
                                  ) : (
                                    <div className="admin-listening-pie-wrap">
                                      <svg
                                        viewBox="0 0 100 100"
                                        className="admin-listening-pie-svg"
                                      >
                                        {artistData.map((d, i) => {
                                          const pct = total
                                            ? (d.count / total) * 100
                                            : 0;
                                          const start = (acc / 100) * 360;
                                          acc += pct;
                                          const sweep = (pct / 100) * 360;
                                          const rad = (deg) =>
                                            (deg * Math.PI) / 180;
                                          const x1 =
                                            50 + 40 * Math.cos(rad(start - 90));
                                          const y1 =
                                            50 + 40 * Math.sin(rad(start - 90));
                                          const x2 =
                                            50 +
                                            40 *
                                              Math.cos(rad(start + sweep - 90));
                                          const y2 =
                                            50 +
                                            40 *
                                              Math.sin(rad(start + sweep - 90));
                                          const large = sweep > 180 ? 1 : 0;
                                          const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;
                                          return (
                                            <path
                                              key={d.name}
                                              d={path}
                                              fill={COLORS[i % COLORS.length]}
                                            />
                                          );
                                        })}
                                      </svg>
                                      <ul className="admin-listening-pie-legend">
                                        {artistData.map((d, i) => (
                                          <li key={d.name}>
                                            <span
                                              className="admin-listening-pie-dot"
                                              style={{
                                                backgroundColor:
                                                  COLORS[i % COLORS.length],
                                              }}
                                            />
                                            {d.name} ({d.count})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })()}
                        </div>
                      </div>
                      <div className="admin-listening-summary">
                        <div className="admin-listening-summary-card admin-listening-summary-card--users">
                          <span className="admin-listening-summary-value">
                            {filtered.length}
                          </span>
                          <span className="admin-listening-summary-label">
                            Users
                          </span>
                        </div>
                        {(() => {
                          const getArtistFromSong = (song) =>
                            (song.artist || "")
                              .split(
                                /\s*[,&|]\s*|\s+feat\.?\s+|\s+ft\.?\s+/i,
                              )[0]
                              ?.trim() || "Unknown";
                          const getPlaysInRange = (msAgo) => {
                            const cutoff = Date.now() - msAgo;
                            const counts = {};
                            filtered.forEach((s) => {
                              (s.last10Songs || []).forEach((song) => {
                                const playedAt = song.playedAt;
                                if (!playedAt) return;
                                const t = new Date(playedAt).getTime();
                                if (isNaN(t) || t < cutoff) return;
                                const artist = getArtistFromSong(song);
                                counts[artist] = (counts[artist] || 0) + 1;
                              });
                            });
                            return Object.entries(counts)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 3)
                              .map(([name, count]) => ({ name, count }));
                          };
                          const weekMs = 7 * 24 * 60 * 60 * 1000;
                          const monthMs = 30 * 24 * 60 * 60 * 1000;
                          const yearMs = 365 * 24 * 60 * 60 * 1000;
                          const topWeek = getPlaysInRange(weekMs);
                          const topMonth = getPlaysInRange(monthMs);
                          const topYear = getPlaysInRange(yearMs);
                          const renderTop3 = (items, label, accent) => (
                            <div
                              key={label}
                              className={`admin-listening-summary-card admin-listening-summary-card--top3 admin-listening-summary-card--${accent}`}
                            >
                              <span className="admin-listening-summary-label">
                                Top 3 · {label}
                              </span>
                              <div className="admin-listening-top3-list">
                                {items.length === 0 ? (
                                  <span className="admin-listening-top3-empty">
                                    —
                                  </span>
                                ) : (
                                  items.map((a, i) => (
                                    <span
                                      key={a.name}
                                      className="admin-listening-top3-item"
                                    >
                                      {i + 1}. {a.name}
                                      {a.count > 0 && (
                                        <span className="admin-listening-top3-count">
                                          {" "}
                                          ({a.count})
                                        </span>
                                      )}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                          return (
                            <>
                              {renderTop3(topWeek, "Week", "week")}
                              {renderTop3(topMonth, "Month", "month")}
                              {renderTop3(topYear, "Year", "year")}
                            </>
                          );
                        })()}
                      </div>
                      <div className="admin-listening-stats-list">
                        {(() => {
                          const getAccountAge = (createdAt) => {
                            if (!createdAt) return null;
                            const t =
                              typeof createdAt?.toDate === "function"
                                ? createdAt.toDate()
                                : new Date(
                                    createdAt?.seconds
                                      ? createdAt.seconds * 1000
                                      : createdAt,
                                  );
                            if (isNaN(t.getTime())) return null;
                            const now = Date.now();
                            const ms = now - t.getTime();
                            const days = Math.floor(ms / (24 * 60 * 60 * 1000));
                            if (days < 1)
                              return { label: "Today", tier: "new" };
                            if (days < 7)
                              return { label: `${days}d`, tier: "new" };
                            if (days < 30)
                              return {
                                label: `${Math.floor(days / 7)}w`,
                                tier: "recent",
                              };
                            if (days < 365)
                              return {
                                label: `${Math.floor(days / 30)}mo`,
                                tier: "established",
                              };
                            return {
                              label: `${Math.floor(days / 365)}y`,
                              tier: "veteran",
                            };
                          };
                          const accountById = new Map();
                          accounts.forEach((a) => accountById.set(a.id, a));
                          const q = listeningStatsSearchQuery
                            .trim()
                            .toLowerCase();
                          const filtered = q
                            ? listeningStats.filter((s) =>
                                (s.userName || "").toLowerCase().includes(q),
                              )
                            : listeningStats;
                          const start =
                            (listeningStatsCurrentPage - 1) *
                            LISTENING_STATS_RECORDS_PER_PAGE;
                          const paginated = filtered.slice(
                            start,
                            start + LISTENING_STATS_RECORDS_PER_PAGE,
                          );
                          return paginated.map((stat) => {
                            const isExpanded = expandedListeningIds.has(
                              stat.id,
                            );
                            const account = accountById.get(
                              stat.accountId || stat.id,
                            );
                            const age = account
                              ? getAccountAge(account.createdAt)
                              : null;
                            return (
                              <div
                                key={stat.id}
                                className={`admin-listening-stat-card ${isExpanded ? "admin-listening-stat-card--expanded" : ""}`}
                              >
                                <button
                                  type="button"
                                  className="admin-listening-stat-header"
                                  onClick={() => {
                                    setExpandedListeningIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(stat.id))
                                        next.delete(stat.id);
                                      else next.add(stat.id);
                                      return next;
                                    });
                                  }}
                                  aria-expanded={isExpanded}
                                >
                                  <span className="admin-listening-stat-title">
                                    {stat.userName || "Unknown"}
                                    {age && (
                                      <span
                                        className={`admin-listening-stat-badge admin-listening-stat-badge--age admin-listening-stat-badge--${age.tier}`}
                                        title={`Account age: ${age.label}`}
                                      >
                                        {age.label}
                                      </span>
                                    )}
                                  </span>
                                  <span className="admin-listening-stat-header-right">
                                    <span className="admin-listening-stat-meta">
                                      {stat.updatedAt
                                        ? new Date(
                                            stat.updatedAt,
                                          ).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "—"}
                                    </span>
                                    <span className="admin-listening-stat-chevron">
                                      {isExpanded ? (
                                        <ChevronUp size={18} />
                                      ) : (
                                        <ChevronDown size={18} />
                                      )}
                                    </span>
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div className="admin-listening-stat-body">
                                    <div className="admin-listening-stat-section admin-listening-stat-section--chart">
                                      <h4>Top artists</h4>
                                      {(stat.top3Artists || []).length === 0 ? (
                                        <p className="admin-listening-empty">
                                          —
                                        </p>
                                      ) : (
                                        <div className="admin-listening-chart">
                                          {(stat.top3Artists || []).map(
                                            (a, i) => {
                                              const maxCount = Math.max(
                                                ...(stat.top3Artists || []).map(
                                                  (x) => x.count ?? 1,
                                                ),
                                                1,
                                              );
                                              const pct =
                                                ((a.count ?? 0) / maxCount) *
                                                100;
                                              return (
                                                <div
                                                  key={i}
                                                  className="admin-listening-chart-row"
                                                >
                                                  <span className="admin-listening-chart-label">
                                                    {a.name}
                                                  </span>
                                                  <div className="admin-listening-chart-bar-wrap">
                                                    <div
                                                      className="admin-listening-chart-bar"
                                                      style={{
                                                        width: `${pct}%`,
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="admin-listening-chart-value">
                                                    {a.count ?? 0}
                                                  </span>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="admin-listening-stat-section">
                                      <h4>Last 10 listened</h4>
                                      <ul className="admin-listening-song-list admin-listening-song-list--compact">
                                        {(stat.last10Songs || []).length ===
                                        0 ? (
                                          <li className="admin-listening-empty">
                                            —
                                          </li>
                                        ) : (
                                          (stat.last10Songs || []).map(
                                            (s, i) => (
                                              <li key={i} title={s.uuid}>
                                                <span className="admin-listening-song-name">
                                                  {s.name}
                                                </span>
                                                {s.artist && (
                                                  <span className="admin-listening-song-artist">
                                                    {s.artist}
                                                  </span>
                                                )}
                                              </li>
                                            ),
                                          )
                                        )}
                                      </ul>
                                    </div>
                                    <div className="admin-listening-stat-section admin-listening-stat-section--full">
                                      <h4>
                                        Favourites (
                                        {(stat.favorites || []).length})
                                      </h4>
                                      <ul className="admin-listening-song-list admin-listening-song-list--compact">
                                        {(stat.favorites || []).length === 0 ? (
                                          <li className="admin-listening-empty">
                                            —
                                          </li>
                                        ) : (
                                          (() => {
                                            const uuidToTrack = {};
                                            existingTracks.forEach((t) => {
                                              const id = t.uuid || t.id;
                                              if (id) uuidToTrack[id] = t;
                                            });
                                            return (stat.favorites || []).map(
                                              (uuid, i) => {
                                                const track = uuidToTrack[uuid];
                                                return (
                                                  <li key={i} title={uuid}>
                                                    <span className="admin-listening-song-name">
                                                      {track?.name || "Unknown"}
                                                    </span>
                                                    {track?.artist && (
                                                      <span className="admin-listening-song-artist">
                                                        {track.artist}
                                                      </span>
                                                    )}
                                                  </li>
                                                );
                                              },
                                            );
                                          })()
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {(() => {
                        const q = listeningStatsSearchQuery
                          .trim()
                          .toLowerCase();
                        const filtered = q
                          ? listeningStats.filter((s) =>
                              (s.userName || "").toLowerCase().includes(q),
                            )
                          : listeningStats;
                        return filtered.length >
                          LISTENING_STATS_RECORDS_PER_PAGE ? (
                          <div className="admin-bulk-pagination">
                            <button
                              type="button"
                              className="admin-bulk-page-btn"
                              onClick={() =>
                                setListeningStatsCurrentPage((p) =>
                                  Math.max(1, p - 1),
                                )
                              }
                              disabled={listeningStatsCurrentPage <= 1}
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <span className="admin-bulk-page-info">
                              Page {listeningStatsCurrentPage} of{" "}
                              {Math.ceil(
                                filtered.length /
                                  LISTENING_STATS_RECORDS_PER_PAGE,
                              )}{" "}
                              ({filtered.length} total
                              {q ? " matching" : ""})
                            </span>
                            <button
                              type="button"
                              className="admin-bulk-page-btn"
                              onClick={() =>
                                setListeningStatsCurrentPage((p) =>
                                  Math.min(
                                    Math.ceil(
                                      filtered.length /
                                        LISTENING_STATS_RECORDS_PER_PAGE,
                                    ),
                                    p + 1,
                                  ),
                                )
                              }
                              disabled={
                                listeningStatsCurrentPage >=
                                Math.ceil(
                                  filtered.length /
                                    LISTENING_STATS_RECORDS_PER_PAGE,
                                )
                              }
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </>
                  );
                })()
              )}
            </div>
          )}
          {activeTab === "playlist" && (
            <div className="admin-hip-tab admin-playlist-tab">
              <div className="admin-bulk-header">
                <h2>
                  <List size={22} className="admin-icon-inline" /> Playlists
                </h2>
                <p className="admin-bulk-subtitle">
                  Manage playlists: name, image, and track UUIDs. Stored in DB.
                </p>
              </div>
              <div className="admin-playlist-actions">
                <button
                  type="button"
                  className="admin-playlist-btn admin-playlist-btn--primary"
                  onClick={() => {
                    setEditingPlaylistId(null);
                    setPlaylistForm({
                      name: "",
                      image: "",
                      trackIds: "",
                    });
                    setPlaylistError("");
                    setShowPlaylistForm(true);
                  }}
                >
                  Add playlist
                </button>
              </div>
              {(showPlaylistForm || editingPlaylistId) && (
                <div className="admin-playlist-form-card">
                  <h3 className="admin-playlist-form-title">
                    {editingPlaylistId ? "Edit playlist" : "New playlist"}
                  </h3>
                  <div className="admin-playlist-form">
                    <div className="admin-settings-field">
                      <label>Name</label>
                      <input
                        type="text"
                        value={playlistForm.name}
                        onChange={(e) =>
                          setPlaylistForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Top 10 of the Week"
                        className="admin-settings-input"
                      />
                    </div>
                    <div className="admin-settings-field">
                      <label>Image (filename in /public/playlistbg/)</label>
                      <input
                        type="text"
                        value={playlistForm.image}
                        onChange={(e) =>
                          setPlaylistForm((p) => ({ ...p, image: e.target.value }))
                        }
                        placeholder="e.g. Top10.png"
                        className="admin-settings-input"
                      />
                    </div>
                    <div className="admin-settings-field">
                      <label>Track UUIDs (comma-separated)</label>
                      <textarea
                        value={playlistForm.trackIds}
                        onChange={(e) =>
                          setPlaylistForm((p) => ({ ...p, trackIds: e.target.value }))
                        }
                        placeholder="uuid1, uuid2, uuid3..."
                        className="admin-settings-input admin-playlist-textarea"
                        rows={4}
                      />
                    </div>
                    {playlistError && (
                      <p className="admin-settings-error">{playlistError}</p>
                    )}
                    <div className="admin-playlist-form-btns">
                      <button
                        type="button"
                        className="admin-playlist-btn admin-playlist-btn--primary"
                        disabled={playlistSaving}
                        onClick={async () => {
                          setPlaylistError("");
                          if (!playlistForm.name.trim()) {
                            setPlaylistError("Name is required.");
                            return;
                          }
                          setPlaylistSaving(true);
                          const trackIds = playlistForm.trackIds
                            .split(/[,\s]+/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (editingPlaylistId) {
                            const res = await updatePlaylist(editingPlaylistId, {
                              name: playlistForm.name,
                              image: playlistForm.image,
                              trackIds,
                            });
                            if (res.success) {
                              const list = await fetchPlaylists();
                              setPlaylists(list);
                              await refreshPlaylists();
                              setEditingPlaylistId(null);
                              setPlaylistForm({ name: "", image: "", trackIds: "" });
                              setShowPlaylistForm(false);
                            } else {
                              setPlaylistError(res.error);
                            }
                          } else {
                            const res = await createPlaylist({
                              name: playlistForm.name,
                              image: playlistForm.image,
                              trackIds,
                            });
                            if (res.success) {
                              const list = await fetchPlaylists();
                              setPlaylists(list);
                              await refreshPlaylists();
                              setPlaylistForm({ name: "", image: "", trackIds: "" });
                              setShowPlaylistForm(false);
                            } else {
                              setPlaylistError(res.error);
                            }
                          }
                          setPlaylistSaving(false);
                        }}
                      >
                        {playlistSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="admin-playlist-btn admin-playlist-btn--secondary"
                        onClick={() => {
                          setEditingPlaylistId(null);
                          setPlaylistForm({ name: "", image: "", trackIds: "" });
                          setPlaylistError("");
                          setShowPlaylistForm(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {loadingPlaylists ? (
                <p className="admin-playlist-loading">Loading playlists...</p>
              ) : playlists.length === 0 ? (
                <p className="admin-playlist-empty">
                  No playlists. Click &quot;Add playlist&quot; to create one.
                </p>
              ) : (
                <div className="admin-playlist-table-wrap">
                  <table className="admin-playlist-table">
                    <thead>
                      <tr>
                        <th className="admin-playlist-th">Image</th>
                        <th className="admin-playlist-th">Name</th>
                        <th className="admin-playlist-th">Tracks</th>
                        <th className="admin-playlist-th">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playlists.map((p) => (
                        <tr key={p.id}>
                          <td className="admin-playlist-td">
                            <img
                              src={`/playlistbg/${p.image || "thar.png"}`}
                              alt={p.name}
                              className="admin-playlist-thumb"
                              onError={(e) => {
                                e.target.src = "/playlistbg/thar.png";
                              }}
                            />
                          </td>
                          <td className="admin-playlist-td">{p.name}</td>
                          <td className="admin-playlist-td">{p.trackIds?.length ?? 0}</td>
                          <td className="admin-playlist-td">
                            <button
                              type="button"
                              className="admin-playlist-action-btn"
                              onClick={() => {
                                setEditingPlaylistId(p.id);
                                setPlaylistForm({
                                  name: p.name,
                                  image: p.image,
                                  trackIds: (p.trackIds || []).join(", "),
                                });
                                setPlaylistError("");
                              }}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              className="admin-playlist-action-btn admin-playlist-action-btn--danger"
                              onClick={async () => {
                                if (!window.confirm(`Delete "${p.name}"?`)) return;
                                const res = await deletePlaylist(p.id);
                                if (res.success) {
                                  setPlaylists(await fetchPlaylists());
                                  await refreshPlaylists();
                                }
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === "story" && (
            <div className="admin-hip-tab admin-story-tab">
              <div className="admin-bulk-header">
                <h2>
                  <BookOpen size={22} className="admin-icon-inline" /> Featured
                  Story (Floating Button Overlay)
                </h2>
                <p className="admin-bulk-subtitle">
                  Configure the Kahaani Beats story overlay shown when users tap
                  the floating book button.
                </p>
              </div>
              {storyLoading ? (
                <p className="admin-playlist-loading">Loading story config...</p>
              ) : (
                <div className="admin-playlist-form-card">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setStoryError("");
                      setStorySuccess("");
                      setStorySaving(true);
                      try {
                        let bannerImageUrl = storyForm.bannerImageUrl;
                        if (storyBannerFile) {
                          const storageRef = ref(
                            storage,
                            `story/banner_${Date.now()}.${storyBannerFile.name.split(".").pop() || "png"}`,
                          );
                          await uploadBytes(storageRef, storyBannerFile);
                          bannerImageUrl = await getDownloadURL(storageRef);
                        }
                        const res = await updateFeaturedStory({
                          ...storyForm,
                          bannerImageUrl: bannerImageUrl || storyForm.bannerImageUrl,
                        });
                        if (res.success) {
                          setStorySuccess("Story config saved successfully.");
                          setStoryForm((f) => ({
                            ...f,
                            bannerImageUrl: bannerImageUrl || f.bannerImageUrl,
                          }));
                          setStoryBannerFile(null);
                        } else {
                          setStoryError(res.error || "Save failed.");
                        }
                      } catch (err) {
                        setStoryError(err.message || "Upload failed.");
                      } finally {
                        setStorySaving(false);
                      }
                    }}
                  >
                    <div className="admin-form-section">
                      <h3>Header</h3>
                      <div className="admin-form-group">
                        <label>Byline</label>
                        <input
                          type="text"
                          value={storyForm.byline}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              byline: e.target.value,
                            }))
                          }
                          placeholder="e.g. brought to you by beatify"
                          className="admin-settings-input"
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Brand</label>
                        <input
                          type="text"
                          value={storyForm.brand}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              brand: e.target.value,
                            }))
                          }
                          placeholder="e.g. Kahaani Beats"
                          className="admin-settings-input"
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Tagline</label>
                        <input
                          type="text"
                          value={storyForm.tagline}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              tagline: e.target.value,
                            }))
                          }
                          placeholder="e.g. There is Always a Story Behind a Great Song"
                          className="admin-settings-input"
                        />
                      </div>
                    </div>
                    <div className="admin-form-section">
                      <h3>Banner Image</h3>
                      <div className="admin-form-group">
                        <label>Current banner</label>
                        {(storyForm.bannerImageUrl || storyBannerFile) ? (
                          <div className="admin-story-banner-preview">
                            {storyBannerFile && !storyBannerPreviewUrl ? (
                              <p className="admin-story-preview-hint">
                                Loading preview...
                              </p>
                            ) : (
                              <img
                                src={
                                  storyBannerFile
                                    ? storyBannerPreviewUrl
                                    : storyForm.bannerImageUrl
                                }
                                alt="Banner preview"
                                className="admin-story-banner-img"
                              />
                            )}
                            <button
                              type="button"
                              className="admin-story-change-btn"
                              onClick={() => storyBannerInputRef.current?.click()}
                            >
                              Change image
                            </button>
                          </div>
                        ) : (
                          <div className="admin-story-banner-empty">
                            <p className="admin-story-preview-hint">
                              No image yet. Upload one below.
                            </p>
                            <button
                              type="button"
                              className="admin-story-change-btn"
                              onClick={() => storyBannerInputRef.current?.click()}
                            >
                              Upload image
                            </button>
                          </div>
                        )}
                        <input
                          ref={storyBannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setStoryBannerFile(e.target.files?.[0] || null)
                          }
                          className="admin-file-input"
                          style={{ display: "none" }}
                        />
                      </div>
                    </div>
                    <div className="admin-form-section">
                      <h3>Story Content</h3>
                      <div className="admin-form-group">
                        <label>Song Title</label>
                        <input
                          type="text"
                          value={storyForm.songTitle}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              songTitle: e.target.value,
                            }))
                          }
                          placeholder="e.g. Itna na na mujh se tu pyar badha (Film: Chhaaya)"
                          className="admin-settings-input"
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Story Description</label>
                        <textarea
                          value={storyForm.songDescription}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              songDescription: e.target.value,
                            }))
                          }
                          placeholder="The story behind the song..."
                          className="admin-settings-input"
                          rows={5}
                          style={{ resize: "vertical" }}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Featured Track UUID</label>
                        <input
                          type="text"
                          value={storyForm.featuredTrackUuid}
                          onChange={(e) =>
                            setStoryForm((f) => ({
                              ...f,
                              featuredTrackUuid: e.target.value,
                            }))
                          }
                          placeholder="UUID of the track to show in the play card"
                          className="admin-settings-input"
                        />
                        <p className="admin-story-preview-hint">
                          Find UUID in Manage Tracks or Bulk tab
                        </p>
                      </div>
                    </div>
                    {storyError && (
                      <p className="admin-settings-error">{storyError}</p>
                    )}
                    {storySuccess && (
                      <p className="admin-settings-success">{storySuccess}</p>
                    )}
                    <button
                      type="submit"
                      className="admin-settings-submit"
                      disabled={storySaving}
                    >
                      {storySaving ? "Saving..." : "Save Story Config"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
          {activeTab === "settings" && (
            <div className="admin-hip-tab admin-settings-tab">
              <div className="admin-bulk-header">
                <h2>
                  <Settings size={22} className="admin-icon-inline" /> Admin
                  Settings
                </h2>
                <p className="admin-bulk-subtitle">
                  Change admin password and manage security settings.
                </p>
              </div>
              <div className="admin-settings-wrap">
                <section className="admin-settings-card">
                  <h3 className="admin-settings-card-title">Change password</h3>
                  <form
                    className="admin-settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSettingsError("");
                    setSettingsSuccess("");
                    if (settingsNewPwd !== settingsConfirmPwd) {
                      setSettingsError("New passwords do not match.");
                      return;
                    }
                    setSettingsUpdating(true);
                    const result = await updateAdminPassword(
                      settingsCurrentPwd,
                      settingsNewPwd,
                    );
                    setSettingsUpdating(false);
                    if (result.success) {
                      setSettingsSuccess("Password updated successfully.");
                      setSettingsCurrentPwd("");
                      setSettingsNewPwd("");
                      setSettingsConfirmPwd("");
                    } else {
                      setSettingsError(result.error || "Update failed.");
                    }
                  }}
                >
                  <div className="admin-settings-field">
                    <label htmlFor="admin-settings-current-pwd">
                      Current password
                    </label>
                    <input
                      id="admin-settings-current-pwd"
                      type="password"
                      value={settingsCurrentPwd}
                      onChange={(e) => {
                        setSettingsCurrentPwd(e.target.value);
                        setSettingsError("");
                      }}
                      placeholder="Enter current password"
                      className="admin-settings-input"
                      required
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="admin-settings-new-pwd">
                      New password (min 6 characters)
                    </label>
                    <input
                      id="admin-settings-new-pwd"
                      type="password"
                      value={settingsNewPwd}
                      onChange={(e) => {
                        setSettingsNewPwd(e.target.value);
                        setSettingsError("");
                      }}
                      placeholder="Enter new password"
                      className="admin-settings-input"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="admin-settings-confirm-pwd">
                      Confirm new password
                    </label>
                    <input
                      id="admin-settings-confirm-pwd"
                      type="password"
                      value={settingsConfirmPwd}
                      onChange={(e) => {
                        setSettingsConfirmPwd(e.target.value);
                        setSettingsError("");
                      }}
                      placeholder="Confirm new password"
                      className="admin-settings-input"
                      required
                    />
                  </div>
                  {settingsError && (
                    <p className="admin-settings-error">{settingsError}</p>
                  )}
                  {settingsSuccess && (
                    <p className="admin-settings-success">{settingsSuccess}</p>
                  )}
                  <button
                    type="submit"
                    className="admin-settings-submit"
                    disabled={settingsUpdating}
                  >
                    {settingsUpdating ? "Updating..." : "Update Password"}
                  </button>
                </form>
                </section>
                <section className="admin-settings-card">
                  <h3 className="admin-settings-card-title">
                    Auto logout
                  </h3>
                  <p className="admin-settings-card-desc">
                    Session will automatically expire after this many minutes of
                    inactivity.
                  </p>
                  <div className="admin-settings-timeout-row">
                    <select
                      value={sessionTimeoutMinutes}
                      onChange={(e) => {
                        setSessionTimeoutMinutes(Number(e.target.value));
                        setSessionTimeoutError("");
                        setSessionTimeoutSuccess("");
                      }}
                      className="admin-settings-input admin-settings-select"
                      disabled={sessionTimeoutUpdating}
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={480}>8 hours</option>
                      <option value={1440}>24 hours</option>
                    </select>
                    <button
                      type="button"
                      className="admin-settings-submit admin-settings-timeout-btn"
                      disabled={sessionTimeoutUpdating}
                      onClick={async () => {
                        setSessionTimeoutError("");
                        setSessionTimeoutSuccess("");
                        setSessionTimeoutUpdating(true);
                        const result = await updateSessionTimeout(
                          sessionTimeoutMinutes,
                        );
                        setSessionTimeoutUpdating(false);
                        if (result.success) {
                          setSessionTimeoutSuccess(
                            "Session timeout updated. New logins will use this setting.",
                          );
                        } else {
                          setSessionTimeoutError(
                            result.error || "Update failed.",
                          );
                        }
                      }}
                    >
                      {sessionTimeoutUpdating ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {sessionTimeoutError && (
                    <p className="admin-settings-error">{sessionTimeoutError}</p>
                  )}
                  {sessionTimeoutSuccess && (
                    <p className="admin-settings-success">
                      {sessionTimeoutSuccess}
                    </p>
                  )}
                </section>
                <div className="admin-settings-logout">
                  <button
                    type="button"
                    className="admin-settings-logout-btn"
                    onClick={async () => {
                      const token = sessionStorage.getItem("adminSessionToken");
                      await invalidateAdminSession(token);
                      sessionStorage.removeItem("adminSessionToken");
                      setIsAuthenticated(false);
                    }}
                  >
                    <Lock size={18} className="admin-icon-inline" /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {messageModalAccount && (
        <>
          <div
            className="modal-overlay admin-message-modal-overlay"
            onClick={handleCloseMessageModal}
            aria-hidden="true"
          />
          <div className="modal admin-message-modal">
            <button
              type="button"
              className="admin-message-modal__close"
              onClick={handleCloseMessageModal}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div className="modal__content">
              <h3 className="modal__title">
                {messageModalSendToAll
                  ? `Send message to all (${messageModalAccount?.filteredAccounts?.length || 0} users)`
                  : `Send message to ${messageModalAccount?.name || "user"}`}
              </h3>
              <p className="admin-message-modal__hint">
                {messageModalSendToAll
                  ? "This will be sent to each user&apos;s notification center."
                  : "This will appear in the user&apos;s notification center."}
              </p>
              <div className="admin-message-modal__field">
                <label htmlFor="admin-message-subject">
                  Subject (optional)
                </label>
                <input
                  id="admin-message-subject"
                  type="text"
                  placeholder="e.g. Welcome to Beatify"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="admin-message-modal__input"
                />
              </div>
              <div className="admin-message-modal__field">
                <label htmlFor="admin-message-body">Message</label>
                <textarea
                  id="admin-message-body"
                  placeholder="Your message..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="admin-message-modal__textarea"
                  rows={4}
                />
              </div>
              <div className="admin-message-modal__actions">
                <button
                  type="button"
                  className="admin-message-modal__btn admin-message-modal__btn--cancel"
                  onClick={handleCloseMessageModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-message-modal__btn admin-message-modal__btn--send"
                  onClick={handleSendMessage}
                  disabled={!messageBody.trim() || sendingMessage}
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;
