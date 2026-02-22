import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useListeningHistory } from '../context/ListeningHistoryContext'
import Sidebar from './Sidebar'
import Artists from './Artists'
import TopArtistsModal from './TopArtistsModal'
import { playlistImages } from './Playlist'
import './Navbar.css'

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const MoonStarsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    <path d="M15 5v1.5M18 8h1.5M16 11l1 1" strokeWidth="1.2" />
  </svg>
)

const HamburgerIcon = ({ open }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
)

const ThemeToggle = ({ isDark, toggleTheme }) => (
  <button
    type="button"
    className={`theme-toggle ${isDark ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
    onClick={toggleTheme}
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
)

const FavoriteIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
)

const MusicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="navbar__music-icon">
    <defs>
      <linearGradient id="navbar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path d="M9 18V5l12-2v13" stroke="url(#navbar-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke="url(#navbar-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="16" r="3" stroke="url(#navbar-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

// Artists data
const allArtists = [
  { id: 1, name: 'Arijit Singh', image: 'arjit' },
  { id: 2, name: 'Mohit Chauhan', image: 'mohit' },
  { id: 3, name: 'Rahat Fateh Ali Khan', image: 'rahet' },
  { id: 4, name: 'Shankar Mahadevan', image: 'shankar' },
  { id: 5, name: 'Richa Sharma', image: 'richa' },
  { id: 6, name: 'Javed Ali', image: 'javedali' },
  { id: 7, name: 'Honey Singh', image: 'honey' },
  { id: 8, name: 'Badshah', image: 'badshah' },
  { id: 9, name: 'Jubin Nautiyal', image: 'JubinNautiyal' },
  { id: 10, name: 'Himesh Reshammiya', image: 'HimeshReshammiya' },
  { id: 11, name: 'Shaan', image: 'Shaan' },
  { id: 12, name: 'Sonu Nigam', image: 'SonuNigam' },
  { id: 13, name: 'Sajid Wajid', image: 'SajidWajid' },
  { id: 14, name: 'Shreya Ghoshal', image: 'ShreyaGhoshal' },
  { id: 15, name: 'Babul Supriyo', image: 'BabulSupriyo' },
  { id: 16, name: 'Guru Randhawa', image: 'GuruRandhawa' },
  { id: 17, name: 'Sukhwinder Singh', image: 'SukhwinderSingh' },
  { id: 18, name: 'Papon', image: 'Papon' },
  { id: 19, name: 'Abhijeet', image: 'AbhijeetBhattacharya' },
  { id: 20, name: 'Vishal-Shekhar', image: 'VishalShekhar' },
  { id: 21, name: 'Atif Aslam', image: 'AtifAslam' },
  { id: 22, name: 'KK', image: 'KK' },
  { id: 23, name: 'Diljit Dosanjh', image: 'DiljitDosanjh' },
  { id: 24, name: 'Shafqat Amanat Ali', image: 'ShafqatAmanatAli' },
  { id: 25, name: 'Sunidhi Chauhan', image: 'SunidhiChauhan' },
  { id: 26, name: 'A. R. Rahman', image: 'ARRahman' },
  { id: 27, name: 'Ajay-Atul', image: 'AjayAtul' },
  { id: 28, name: 'Ayushmann Khurrana', image: 'AyushmannKhurrana' },
  { id: 29, name: 'Armaan Malik', image: 'ArmaanMalik' },
  { id: 30, name: 'Harrdy Sandhu', image: 'HarrdySandhu' },
  { id: 31, name: 'Vishal Mishra', image: 'VishalMishra' },
  { id: 32, name: 'Harshit Saxena', image: 'HarshitSaxena' },
  { id: 33, name: 'Alka Yagnik', image: 'AlkaYagnik' },
  { id: 34, name: 'Udit Narayan', image: 'UditNarayan' },
  { id: 35, name: 'Kumar Sanu', image: 'KumarSanu' },
  { id: 36, name: 'Kailash Kher', image: 'KailashKher' },
  { id: 37, name: 'Kishore Kumar', image: 'KishoreKumar' },
]

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme()
  const { getTopArtists } = useListeningHistory()
  const [menuOpen, setMenuOpen] = useState(false)
  const [topArtistsModalOpen, setTopArtistsModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [searchParams, setSearchParams] = useSearchParams()
  const showFavorites = searchParams.get('favorites') === 'true'
  const selectedArtist = searchParams.get('artist')
  const selectedPlaylist = searchParams.get('playlist') || ''
  const view = searchParams.get('view') || (isMobile ? 'track' : 'playlist')
  const searchQuery = searchParams.get('search') || ''

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const showPlaylistHeader = isMobile && selectedPlaylist && view === 'track'
  useEffect(() => {
    if (showPlaylistHeader) {
      document.body.classList.add('playlist-header-visible')
    } else {
      document.body.classList.remove('playlist-header-visible')
    }
    return () => document.body.classList.remove('playlist-header-visible')
  }, [showPlaylistHeader])

  // Remove artist filter on page reload
  useEffect(() => {
    const currentArtist = searchParams.get('artist')
    if (currentArtist) {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('artist')
      setSearchParams(newSearchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - runs only on mount

  const handleSearchChange = (e) => {
    const newSearchParams = new URLSearchParams(searchParams)
    const value = e.target.value
    if (value.trim()) {
      newSearchParams.set('search', value)
    } else {
      newSearchParams.delete('search')
    }
    setSearchParams(newSearchParams)
  }

  const toggleFavorites = () => {
    if (showFavorites) {
      searchParams.delete('favorites')
    } else {
      searchParams.set('favorites', 'true')
    }
    setSearchParams(searchParams)
  }

  const handleArtistClick = (artistName) => {
    const newSearchParams = new URLSearchParams(searchParams)
    if (selectedArtist === artistName) {
      // If clicking the same artist, deselect it
      newSearchParams.delete('artist')
    } else {
      // Select the new artist
      newSearchParams.set('artist', artistName)
      // Remove favorites and playlist filters when selecting an artist
      newSearchParams.delete('favorites')
      newSearchParams.delete('playlist')
      
      // Save to localStorage - remember first 4 selected artists
      const savedArtists = JSON.parse(localStorage.getItem('selectedArtists') || '[]')
      // Remove if already exists (to avoid duplicates)
      const filtered = savedArtists.filter(name => name !== artistName)
      // Add to beginning and keep only first 4
      const updated = [artistName, ...filtered].slice(0, 4)
      localStorage.setItem('selectedArtists', JSON.stringify(updated))
    }
    setSearchParams(newSearchParams)
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar__brand">
          <MusicIcon />
          Beatify
        </Link>

        {/* Search field - visible on all screens */}
        <div className="navbar__search">
          <SearchIcon />
          <input
            type="text"
            className="navbar__search-input"
            placeholder="Search here..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search tracks and artists"
          />
        </div>

        {/* Desktop: top artists, favorites, theme toggle */}
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
            className={`navbar__favorites-btn ${showFavorites ? 'navbar__favorites-btn--active' : ''}`}
            onClick={toggleFavorites}
            aria-label={showFavorites ? 'Show all tracks' : 'Show favorites only'}
          >
            <FavoriteIcon filled={showFavorites} />
          </button>
          <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        </div>

        {/* Mobile: hamburger button */}
        <button
          type="button"
          className="navbar__hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <HamburgerIcon open={menuOpen} />
        </button>

        <Sidebar
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          onOpenTopArtists={() => {
            setMenuOpen(false)
            setTopArtistsModalOpen(true)
          }}
        />
        <TopArtistsModal
          isOpen={topArtistsModalOpen}
          onClose={() => setTopArtistsModalOpen(false)}
          topArtists={getTopArtists(3)}
          allArtists={allArtists}
        />
      </nav>
      {isMobile && selectedPlaylist && view === 'track' ? (
        <div
          className="playlist-header-mobile"
          style={{
            backgroundImage: `url(${`/playlist/${playlistImages.find((p) => p.label === selectedPlaylist)?.image || 'thar.png'}`})`,
          }}
        >
          <img
            src={`/playlist/${playlistImages.find((p) => p.label === selectedPlaylist)?.image || 'thar.png'}`}
            alt={selectedPlaylist}
            className="playlist-header-mobile__image"
            onError={(e) => {
              const fallback = playlistImages.find((p) => p.label === selectedPlaylist)
              const fallbackSrc = fallback ? `/playlistbg/${fallback.image}` : '/playlistbg/thar.png'
              e.target.src = fallbackSrc
              e.target.parentElement.style.backgroundImage = `url(${fallbackSrc})`
            }}
          />
          <div className="playlist-header-mobile__label">{selectedPlaylist}</div>
        </div>
      ) : (
        <Artists
          artists={allArtists}
          selectedArtist={selectedArtist}
          searchQuery={searchQuery}
          onArtistClick={handleArtistClick}
        />
      )}
    </>
  )
}

export default Navbar
