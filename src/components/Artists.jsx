import React, { useEffect, useRef, useState } from "react";
import { fetchMusicList } from "../services/musicService";
import { fuzzyMatches, fuzzyMatchesAny } from "../utils/searchUtils";
import "./Artists.css";

const SCROLL_SPEED = 15;

const ArtistsProfileIcon = () => (
  <svg
    className="artists-section__icon-svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="beatify-icon-gradient-artists"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <g
      fill="none"
      stroke="url(#beatify-icon-gradient-artists)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </g>
  </svg>
);

const PlayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const ArtistCard = ({
  artist,
  isSelected,
  shouldGrayOut,
  onArtistClick,
  selectedCardRef,
  tileLayout = false,
}) => {
  const nameRef = useRef(null);
  const [shouldScrollName, setShouldScrollName] = useState(false);
  const [nameDuration, setNameDuration] = useState(20);

  useEffect(() => {
    if (tileLayout) return;
    const checkOverflow = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (nameRef.current) {
            const nameEl = nameRef.current;
            const wrapperEl = nameEl.closest(".artist-name-wrapper");
            const innerEl = nameEl.closest(".artist-name-inner");
            if (wrapperEl && innerEl) {
              const isOverflowing =
                nameEl.scrollWidth > wrapperEl.offsetWidth + 5;
              setShouldScrollName(isOverflowing);
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth;
                const distance = totalWidth / 2;
                const duration = distance / SCROLL_SPEED;
                setNameDuration(Math.max(duration, 10));
              }
            }
          }
        }, 100);
      });
    };
    checkOverflow();
    const resizeHandler = () => checkOverflow();
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, [artist.name, tileLayout]);

  return (
    <div
      ref={isSelected ? selectedCardRef : null}
      className={`artist-card ${tileLayout ? "artist-card--tile" : ""} ${shouldGrayOut ? "artist-card--grayed" : ""}`}
      onClick={() => onArtistClick && onArtistClick(artist.name)}
    >
      <div
        className={`artist-image-wrapper ${tileLayout ? "artist-image-wrapper--tile" : ""} ${isSelected ? "artist-image-wrapper--selected" : ""}`}
      >
        <img
          src={getImagePath(artist.image)}
          alt={artist.name}
          className={`artist-image ${tileLayout ? "artist-image--tile" : ""} ${shouldGrayOut ? "artist-image--grayed" : ""}`}
          onError={(e) => {
            const img = e.target;
            if (img.dataset.fallback === "1") return;
            img.dataset.fallback = "1";
            img.style.display = "none";
            const ph = document.createElement("div");
            ph.className = tileLayout
              ? "artist-placeholder artist-placeholder--tile"
              : "artist-placeholder";
            ph.textContent = artist.name.charAt(0);
            img.insertAdjacentElement("afterend", ph);
          }}
        />
        {tileLayout && (
          <div className="artist-name-overlay" aria-hidden="true">
            <span className="artist-name artist-name--overlay">{artist.name}</span>
          </div>
        )}
        {isSelected && (
          <button
            type="button"
            className={`artist-play-btn ${tileLayout ? "artist-play-btn--tile" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("playArtist", {
                  detail: { artistName: artist.name },
                }),
              );
            }}
            aria-label={`Play ${artist.name}`}
          >
            <PlayIcon />
          </button>
        )}
      </div>
      {!tileLayout && (
        <div className="artist-name-wrapper">
          <div
            className={`artist-name-inner ${isSelected && shouldScrollName ? "artist-name--scroll" : ""}`}
            style={
              isSelected && shouldScrollName
                ? { "--scroll-duration": `${nameDuration}s` }
                : {}
            }
          >
            <p
              ref={nameRef}
              className={`artist-name ${!(isSelected && shouldScrollName) ? "artist-name--truncate" : ""}`}
            >
              {artist.name}
            </p>
            {isSelected && shouldScrollName && (
              <p className="artist-name artist-name--duplicate">{artist.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Map image names from JSON to actual filenames in public/Artists folder (exported for reuse)
export const getImagePath = (imageName) => {
  const imageMap = {
    arjit: "arjitsingh.jpeg",
    mohit: "mohit.webp",
    rahet: "rahet.png",
    shankar: "shankar.jpeg",
    richa: "richa.jpeg",
    javedali: "javedali.jpeg",
    honey: "honey.jpg",
    badshah: "badshah.jpeg",
    JubinNautiyal: "Jubin Nautiyal.jpeg",
    HimeshReshammiya: "Himesh Reshammiya.webp",
    Shaan: "Shaan.jpeg",
    SonuNigam: "Sonu Nigam.jpg",
    SajidWajid: "SajidWajid.jpeg",
    ShreyaGhoshal: "Shreya Ghoshal.jpeg",
    BabulSupriyo: "BabulSupriyo .jpeg",
    GuruRandhawa: "Guru Randhawa.webp",
    SukhwinderSingh: "Sukhwinder Singh.webp",
    Papon: "Papon.jpg",
    AbhijeetBhattacharya: "AbhijeetBhattacharya.webp",
    VishalShekhar: "Vishal-Shekhar .jpeg",
    AtifAslam: "Atif Aslam.jpg",
    KK: "KK.jpeg",
    DiljitDosanjh: "Diljit Dosanjh.jpeg",
    ShafqatAmanatAli: "ShafqatAmanatAli.jpeg",
    SunidhiChauhan: "Sunidhi Chauhan.jpeg",
    ARRahman: "ARRahman.jpg",
    AjayAtul: "Ajay-Atul.webp",
    AyushmannKhurrana: "AyushmannKhurrana.jpeg",
    ArmaanMalik: "ArmaanMalik.webp",
    HarrdySandhu: "HarrdySandhu.webp",
    VishalMishra: "VishalMishra.jpeg",
    HarshitSaxena: "Harshit Saxena .jpeg",
    AlkaYagnik: "Alka Yagnik.jpg",
    UditNarayan: "Udit Narayan.jpeg",
    KumarSanu: "Kumar Sanu.jpeg",
    KailashKher: "Kailash Kher.jpg",
    KishoreKumar: "Kishore Kumar.webp",
    lata: "lata.png",
  };

  const filename = imageMap[imageName] || `${imageName}.jpg`;
  return `/Artists/${filename}`;
};

const Artists = ({
  artists,
  selectedArtist,
  searchQuery,
  onArtistClick,
  inline = false,
}) => {
  const containerRef = useRef(null);
  const selectedCardRef = useRef(null);
  const [musicList, setMusicList] = useState([]);

  // Fetch music list when there's a search query to filter artists by matching tracks
  useEffect(() => {
    if (searchQuery) {
      fetchMusicList()
        .then((tracks) => setMusicList(tracks))
        .catch((err) => {
          console.error("Error fetching music list for artist filtering:", err);
          setMusicList([]);
        });
    } else if (musicList.length > 0) {
      // Only clear if we have data to avoid unnecessary renders
      setMusicList([]);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter tracks based on search query (fuzzy match, ~75% similarity)
  const filteredTracks = React.useMemo(() => {
    if (!searchQuery || musicList.length === 0) return [];
    return musicList.filter((track) =>
      fuzzyMatchesAny(
        searchQuery,
        track.name,
        track.artist,
        track.album,
        track.genre,
      ),
    );
  }, [musicList, searchQuery]);

  // Filter and reorder artists
  const reorderedArtists = React.useMemo(() => {
    if (artists.length === 0) return artists;

    // First, filter by search query if present
    let filteredArtists = artists;
    if (searchQuery) {
      filteredArtists = artists.filter((artist) => {
        const artistName = artist.name || "";
        const nameMatches = fuzzyMatches(searchQuery, artistName);
        if (filteredTracks.length > 0) {
          const artistName = artist.name || "";
          const hasMatchingTracks = filteredTracks.some((track) =>
            fuzzyMatches(artistName, track.artist || ""),
          );
          return nameMatches || hasMatchingTracks;
        }
        return nameMatches;
      });
    } else if (filteredTracks.length > 0) {
      // Even without search query, filter out artists with no tracks if we have filtered tracks
      filteredArtists = artists.filter((artist) => {
        const artistName = (artist.name || "").toLowerCase();
        return filteredTracks.some((track) => {
          const trackArtist = (track.artist || "").toLowerCase();
          return (
            trackArtist.includes(artistName) || artistName.includes(trackArtist)
          );
        });
      });
    }

    // Then reorder based on localStorage (first 4 selected artists)
    const savedArtists = JSON.parse(
      localStorage.getItem("selectedArtists") || "[]",
    );

    if (savedArtists.length > 0) {
      // Find artists that match saved names (first 4)
      const prioritizedArtists = [];
      const remainingArtists = [];

      filteredArtists.forEach((artist) => {
        const index = savedArtists.indexOf(artist.name);
        if (index !== -1) {
          prioritizedArtists[index] = artist;
        } else {
          remainingArtists.push(artist);
        }
      });

      // Filter out undefined entries and combine
      return prioritizedArtists.filter(Boolean).concat(remainingArtists);
    }

    return filteredArtists;
  }, [artists, searchQuery, filteredTracks]);

  // Scroll to start on initial load if we have reordered artists
  useEffect(() => {
    const savedArtists = JSON.parse(
      localStorage.getItem("selectedArtists") || "[]",
    );
    if (savedArtists.length > 0 && containerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, []);

  // Auto-scroll back to selected artist after 10s of inactivity
  useEffect(() => {
    if (!selectedArtist || !containerRef.current || !selectedCardRef.current)
      return;

    const scrollContainer = containerRef.current;
    const selectedCard = selectedCardRef.current;
    let inactivityTimer = null;

    const scrollToSelectedArtist = () => {
      const rect = selectedCard.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const isVisible =
        rect.left >= containerRect.left && rect.right <= containerRect.right;
      if (!isVisible) {
        selectedCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    };

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        scrollToSelectedArtist();
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
  }, [selectedArtist]);

  // Don't render if no artists match
  if (reorderedArtists.length === 0) {
    return null;
  }

  return (
    <div
      className={`artists-section${inline ? " artists-section--inline" : ""}`}
    >
      {inline && (
        <div className="artists-section__header artists-section__header--inline">
          <h4 className="artists-section__title">
            <span className="artists-section__icon" aria-hidden="true">
              <ArtistsProfileIcon />
            </span>
            Artists
          </h4>
        </div>
      )}
      <div
        className={`artists-container${inline ? " artists-container--inline" : ""}`}
        ref={containerRef}
      >
        {reorderedArtists.map((artist) => {
          const isSelected = selectedArtist === artist.name;
          const shouldGrayOut = selectedArtist && !isSelected;
          return (
            <ArtistCard
              key={artist.id}
              artist={artist}
              isSelected={isSelected}
              shouldGrayOut={shouldGrayOut}
              onArtistClick={onArtistClick}
              selectedCardRef={selectedCardRef}
              tileLayout={inline}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Artists;
