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
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import * as XLSX from "xlsx";
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

const Admin = () => {
  const { isDark, toggleTheme } = useTheme();
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

  const excelFileInputRef = useRef(null);

  const BULK_RECORDS_PER_PAGE = 20;
  const ADMIN_PASSWORD = "8369877891";

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
    const authStatus = sessionStorage.getItem("adminAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchExistingTracks();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExistingTracks();
    }
  }, [isAuthenticated]);

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
    const handleClickOutside = (e) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setSortDropdownOpen(false);
      }
    };
    if (sortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortDropdownOpen]);

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

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
      setPasswordInput("");
      sessionStorage.setItem("adminAuthenticated", "true");
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPasswordInput("");
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
              <div className="admin-password-input-group">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
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
                    disabled
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
        </div>
      </div>
    </div>
  );
};

export default Admin;
