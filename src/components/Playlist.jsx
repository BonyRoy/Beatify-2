import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './Playlist.css'

const PlaylistIconGradient = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="playlist__icon-gradient">
    <defs>
      <linearGradient id="playlist-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect x="3" y="5" width="5" height="3" rx="0.5" fill="url(#playlist-gradient)" />
    <rect x="3" y="11" width="5" height="3" rx="0.5" fill="url(#playlist-gradient)" />
    <rect x="3" y="17" width="5" height="3" rx="0.5" fill="url(#playlist-gradient)" />
    <line x1="11" y1="6.5" x2="20" y2="6.5" stroke="url(#playlist-gradient)" strokeWidth="2" strokeLinecap="round" />
    <line x1="11" y1="12.5" x2="20" y2="12.5" stroke="url(#playlist-gradient)" strokeWidth="2" strokeLinecap="round" />
    <line x1="11" y1="18.5" x2="20" y2="18.5" stroke="url(#playlist-gradient)" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// Playlist images with labels - update this list with actual image filenames from /public/playlist
const playlistImages = [
  { image: 'Disney.png', label: 'Disney & Pixar' },
  { image: 'oldmelodies.png', label: 'Old Melodies' },
  { image: 'bharat.png', label: 'Bharat' },
  // { image: 'chillvibes.png', label: 'Chill Vibes' },
  // { image: 'edm.png', label: 'EDM' },
  // { image: 'Globalmusic.png', label: 'Global Music' },
  // { image: 'gym.png', label: 'Gym' },
  { image: 'holi.png', label: 'Holi' },
  // { image: 'party.png', label: 'Party' },
  { image: 'romantic.png', label: 'Romantic' },
  { image: 'thar.png', label: 'Thar' },
  { image: 'valentine.png', label: 'Valentine' },
]

const Playlist = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchQuery = searchParams.get('search') || ''
  const selectedPlaylist = searchParams.get('playlist') || ''
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) {
      return playlistImages
    }
    
    const query = searchQuery.toLowerCase()
    return playlistImages.filter(playlist => 
      playlist.label.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handlePlaylistClick = (playlistLabel) => {
    const newSearchParams = new URLSearchParams(searchParams)
    if (selectedPlaylist === playlistLabel) {
      // Deselect if clicking the same playlist
      newSearchParams.delete('playlist')
    } else {
      // Select the new playlist
      newSearchParams.set('playlist', playlistLabel)
      // Remove artist and favorites filters when selecting a playlist
      newSearchParams.delete('artist')
      newSearchParams.delete('favorites')
    }
    
    // On mobile, navigate to tracks view after selecting playlist
    if (isMobile && selectedPlaylist !== playlistLabel) {
      newSearchParams.set('view', 'track')
      navigate(`/?${newSearchParams.toString()}`)
    } else {
      setSearchParams(newSearchParams)
    }
  }

  return (
    <div className="playlist">
      <div className="playlist__header">
        <h4 className="playlist__title">
          <PlaylistIconGradient />
          Playlist
        </h4>
      </div>
      <div className="playlist__grid">
        {filteredPlaylists.length === 0 ? (
          <div className="playlist__empty">
            <p>No playlists found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredPlaylists.map((playlist, index) => {
            const isSelected = selectedPlaylist === playlist.label
            return (
              <div 
                key={index} 
                className={`playlist__item ${isSelected ? 'playlist__item--selected' : ''}`}
                onClick={() => handlePlaylistClick(playlist.label)}
              >
                <div className="playlist__image-wrapper">
                  <img 
                    src={`/playlist/${playlist.image}`} 
                    alt={playlist.label}
                    className="playlist__image"
                    onError={(e) => {
                      // Fallback to playlistbg if playlist folder doesn't exist
                      e.target.src = `/playlistbg/${playlist.image}`
                    }}
                  />
                  <div className="playlist__label">{playlist.label}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Playlist
