import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './Sidebar.css'

const FavoriteIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

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

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PlaylistIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

const TrackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

const ThemeToggle = ({ isDark, toggleTheme }) => (
  <button
    type="button"
    className={`sidebar__theme-toggle ${isDark ? 'sidebar__theme-toggle--dark' : 'sidebar__theme-toggle--light'}`}
    onClick={toggleTheme}
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
)

const Sidebar = ({ isOpen, onClose }) => {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentView = searchParams.get('view') || 'playlist'
  const showFavorites = searchParams.get('favorites') === 'true'

  const handleTrackOrPlaylist = () => {
    navigate(currentView === 'track' ? '/?view=playlist' : '/?view=track')
    onClose()
  }

  const handleToggleFavorites = () => {
    const newParams = new URLSearchParams(searchParams)
    if (showFavorites) {
      newParams.delete('favorites')
    } else {
      newParams.set('favorites', 'true')
    }
    setSearchParams(newParams)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className={`sidebar__overlay ${isOpen ? 'sidebar__overlay--open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <CloseIcon />
        </button>

        <div className="sidebar__content">
          <div className="sidebar__item" onClick={toggleTheme} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleTheme()}>
            <span className="sidebar__label">Theme</span>
            <span onClick={(e) => e.stopPropagation()}>
              <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
            </span>
          </div>

          <button
            type="button"
            className={`sidebar__item sidebar__item--button ${showFavorites ? 'sidebar__item--active' : ''}`}
            onClick={handleToggleFavorites}
          >
            <span className="sidebar__label">Favorites</span>
            <span className="sidebar__icon">
              <FavoriteIcon filled={showFavorites} />
            </span>
          </button>

          <button
            type="button"
            className="sidebar__item sidebar__item--button"
            onClick={handleTrackOrPlaylist}
          >
            <span className="sidebar__label">{currentView === 'track' ? 'Playlist' : 'Track'}</span>
            <span className="sidebar__icon">
              {currentView === 'track' ? <PlaylistIcon /> : <TrackIcon />}
            </span>
          </button>
        </div>

        <div className="sidebar__footer">
          <p className="sidebar__version">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
