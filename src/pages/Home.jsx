import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import DownloadModal from '../components/DownloadModal'
import Playlist from '../components/Playlist'
import { fetchMusicList } from '../services/musicService'
import { usePlayer } from '../context/PlayerContext'
import './Home.css'

const DownloadIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const FavoriteIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const MusicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

const MusicIconGradient = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="home__music-icon-gradient" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
)

// Format file size from bytes to MB (matching reference implementation)
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

const MusicTrack = ({ track, onDownloadClick, onFavoriteToggle, onTrackClick, favorites, downloads, isSelected }) => {
  // Use UUID if available, otherwise fall back to track ID (matching reference implementation)
  const trackIdentifier = track.uuid || track.id
  const isFavorite = favorites.includes(trackIdentifier)
  const isDownloaded = downloads.includes(trackIdentifier)
  
  // Refs for overflow detection
  const titleRef = useRef(null)
  const artistRef = useRef(null)
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false)
  const [shouldScrollArtist, setShouldScrollArtist] = useState(false)
  
  // Get album art URL - check multiple possible field names
  const albumArtUrl = track.coverUrl || track.artworkUrl || track.albumArtUrl
  
  // Format file size - handle both bytes (number) and string formats
  const fileSize = track.fileSize 
    ? (typeof track.fileSize === 'number' ? formatFileSize(track.fileSize) : track.fileSize)
    : 'Unknown'
  
  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (titleRef.current) {
            const titleEl = titleRef.current
            const wrapperEl = titleEl.closest('.track-row__title-wrapper')
            if (wrapperEl) {
              const isOverflowing = titleEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollTitle(isOverflowing)
            }
          }
          if (artistRef.current) {
            const artistEl = artistRef.current
            const wrapperEl = artistEl.closest('.track-row__artist-wrapper')
            if (wrapperEl) {
              const isOverflowing = artistEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollArtist(isOverflowing)
            }
          }
        }, 100)
      })
    }

    checkOverflow()
    const resizeHandler = () => checkOverflow()
    window.addEventListener('resize', resizeHandler)
    return () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }, [track.name, track.artist])
  
  const handleRowClick = (e) => {
    // Don't trigger track selection if clicking on buttons
    if (e.target.closest('.track-row__actions') || e.target.closest('button')) {
      return
    }
    onTrackClick(track)
  }
  
  return (
    <div className={`track-row ${isSelected ? 'track-row--selected' : ''}`} onClick={handleRowClick}>
      <div className="track-row__art-wrapper">
        {albumArtUrl ? (
          <img className="track-row__art" src={albumArtUrl} alt={`${track.name} album art`} />
        ) : (
          <div className="track-row__art track-row__art--placeholder">
            <MusicIcon />
          </div>
        )}
      </div>
      <div className="track-row__info">
        <div className="track-row__title-wrapper">
          <div className={`track-row__title-inner ${shouldScrollTitle ? 'track-row__text--scroll' : ''}`}>
            <p ref={titleRef} className="track-row__title">{track.name}</p>
            {shouldScrollTitle && (
              <p className="track-row__title track-row__text--duplicate">{track.name}</p>
            )}
          </div>
        </div>
        <div className="track-row__artist-wrapper">
          <div className={`track-row__artist-inner ${shouldScrollArtist ? 'track-row__text--scroll' : ''}`}>
            <p ref={artistRef} className="track-row__artist">{track.artist}</p>
            {shouldScrollArtist && (
              <p className="track-row__artist track-row__text--duplicate">{track.artist}</p>
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
            aria-label={isDownloaded ? 'Remove download' : 'Download'}
          >
            <DownloadIcon filled={isDownloaded} />
          </button>
          <button
            type="button"
            className={`track-row__icon-btn track-row__icon-btn--fav ${isFavorite ? 'track-row__icon-btn--active' : ''}`}
            onClick={() => onFavoriteToggle(trackIdentifier)}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FavoriteIcon filled={isFavorite} />
          </button>
        </div>
        <p className="track-row__duration">{fileSize}</p>
      </div>
    </div>
  )
}

// Playlist UUID mappings - keys must match playlist labels exactly
const playlistTrackIds = {
  'Bharat': [
    '32d36fc7-d69a-4217-b004-baf9412988ec',
    '1cd9f324-4f86-4814-a04e-ec8f30bf287d',
    '5855e5dd-b061-45f4-8a73-f53485f41181',
    '9b8a6e98-ae82-449e-a526-284561ee605e',
    '318ccac8-c78e-4541-97f4-674fb594d977',
    '140b03ca-7b00-4521-9ebd-fc45469df14d'
  ],
  'Valentine': [
    'f4134ccd-adb5-4d62-b0a8-a9fd8d74e23e',
    '1a707f3c-fb6b-45d3-b5c1-a3ebeb896425',
    '1358929a-bd9a-46a9-bceb-f3f4c997a231',
    'd6f16706-596f-467a-a764-04618b68a3a0',
    '11f5f287-8202-48ca-a7be-4edcee8189cf',
    '4f908ca9-9037-4ac9-9904-45f8897a9009',
    '82b368b9-fb3f-441b-829a-b765922d17f2',
    '22c9c82d-6132-4752-8d51-9f6d7d0ea6d8',
    'e2c748fd-12f3-489a-b47a-021ff544f4c6',
    'd729a181-13e4-46f7-aee1-89f5011ca03c'
  ],
  'Holi': [
    '32d36fc7-d69a-4217-b004-baf9412988ec',
    '1cd9f324-4f86-4814-a04e-ec8f30bf287d',
    '5855e5dd-b061-45f4-8a73-f53485f41181',
    '9b8a6e98-ae82-449e-a526-284561ee605e',
    '318ccac8-c78e-4541-97f4-674fb594d977',
    '140b03ca-7b00-4521-9ebd-fc45469df14d'
  ],
  'Old Melodies': [],
  'Romantic': [],
  'Party': [],
  'Chill Vibes': [],
  'Gym': [],
  'EDM': [],
  'Global Music': [],
  'Thar': [
    '937cf202-b571-4433-97cf-9883d82c87d1',
    '82427d5d-7ceb-4792-b359-72ea31957458',
    '2519d158-44f3-485b-9b62-906b843e21f6',
    'b06464f2-c409-426f-85eb-aeda8c9de721',
    'c59fd324-9f22-41b0-9e0e-1c88c9a54087',
    '287ceed9-d87b-44d1-ad6c-a3dd979dbc79',
    '45b5c009-d3f7-4d9b-bd7c-02f337e216e6'
  ]
}

const Home = () => {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') || 'playlist'
  const mobileView = view === 'home' ? 'playlist' : view
  const showFavorites = searchParams.get('favorites') === 'true'
  const selectedArtist = searchParams.get('artist')
  const selectedPlaylist = searchParams.get('playlist')
  const searchQuery = searchParams.get('search') || ''
  const { selectTrack, currentTrack, setPlaylist } = usePlayer()
  
  const [musicList, setMusicList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [downloads, setDownloads] = useState([])
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)

  useEffect(() => {
    loadMusicList()
    
    // Load favorites and downloads from localStorage
    const savedFavorites = localStorage.getItem('favorites')
    const savedDownloads = localStorage.getItem('downloads')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
    if (savedDownloads) {
      setDownloads(JSON.parse(savedDownloads))
    }
  }, [])

  const loadMusicList = async () => {
    try {
      setLoading(true)
      setError(null)
      const tracks = await fetchMusicList()
      setMusicList(tracks)
    } catch (err) {
      console.error('Error loading music list:', err)
      setError('Failed to load music. Please check your Firebase configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadClick = (track) => {
    setSelectedTrack(track)
    setIsDownloadModalOpen(true)
  }

  const handleDownload = () => {
    if (selectedTrack) {
      // Use UUID if available, otherwise use track ID
      const trackIdentifier = selectedTrack.uuid || selectedTrack.id
      
      // Add to downloads
      const newDownloads = [...downloads, trackIdentifier]
      setDownloads(newDownloads)
      localStorage.setItem('downloads', JSON.stringify(newDownloads))
      
      // Trigger actual download if fileUrl is available (matching reference implementation)
      if (selectedTrack.fileUrl) {
        const link = document.createElement('a')
        link.href = selectedTrack.fileUrl
        link.download = selectedTrack.name || 'track'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
    setIsDownloadModalOpen(false)
  }

  const handleFavoriteToggle = (trackIdentifier) => {
    const newFavorites = favorites.includes(trackIdentifier)
      ? favorites.filter(id => id !== trackIdentifier)
      : [...favorites, trackIdentifier]
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(newFavorites))
  }

  // Filter music list based on search, favorites filter, artist selection, or playlist selection
  const filteredMusicList = useMemo(() => {
    let filtered = musicList

    // Apply playlist filter first if present (highest priority)
    if (selectedPlaylist && playlistTrackIds[selectedPlaylist]) {
      const playlistUuids = playlistTrackIds[selectedPlaylist]
      if (playlistUuids.length > 0) {
        filtered = filtered.filter(track => {
          const trackIdentifier = track.uuid || track.id
          return playlistUuids.includes(trackIdentifier)
        })
      } else {
        // Empty playlist - return empty array
        return []
      }
    }

    // Apply favorites filter if present (and no playlist selected)
    if (!selectedPlaylist && showFavorites) {
      filtered = filtered.filter(track => {
        const trackIdentifier = track.uuid || track.id
        return favorites.includes(trackIdentifier)
      })
    }
    
    // Apply artist filter if present (works within playlist or standalone, but not with favorites)
    if (!showFavorites && selectedArtist) {
      filtered = filtered.filter(track => {
        // Check if the track's artist matches the selected artist
        const trackArtist = track.artist || ''
        return trackArtist.toLowerCase().includes(selectedArtist.toLowerCase()) ||
               selectedArtist.toLowerCase().includes(trackArtist.toLowerCase())
      })
    }

    // Finally apply search filter if present (searches within already filtered results)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(track => {
        const trackName = (track.name || '').toLowerCase()
        const trackArtist = (track.artist || '').toLowerCase()
        const trackAlbum = (track.album || '').toLowerCase()
        return trackName.includes(query) || 
               trackArtist.includes(query) || 
               trackAlbum.includes(query)
      })
    }

    return filtered
  }, [musicList, searchQuery, showFavorites, selectedArtist, selectedPlaylist, favorites])

  const handleTrackClick = (track) => {
    selectTrack(track, filteredMusicList)
  }

  // Update playlist when filtered list changes
  useEffect(() => {
    if (filteredMusicList.length > 0) {
      setPlaylist(filteredMusicList)
    }
  }, [filteredMusicList, setPlaylist])

  const handleCloseModal = () => {
    setIsDownloadModalOpen(false)
    setSelectedTrack(null)
  }

  const selectedTrackData = selectedTrack ? {
    name: selectedTrack.name,
    artist: selectedTrack.artist,
    size: selectedTrack.fileSize ? `${(selectedTrack.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'
  } : {
    name: '',
    artist: '',
    size: ''
  }

  return (
    <div className={`home home--mobile-view-${mobileView}`}>
      <div className="home__grid">
        <aside className="home__sidebar">
          {showFavorites && !loading && !error && (
            <div className="home__sidebar-header">
              <h3 className="home__sidebar-title">
                <FavoriteIcon filled={true} />
                Favorites
              </h3>
            </div>
          )}
          {!showFavorites && !loading && !error && (
            <div className="home__sidebar-header home__sidebar-header--tracks">
              <h3 className="home__sidebar-title home__sidebar-title--tracks">
                <MusicIconGradient />
                {selectedPlaylist ? `Tracks for "${selectedPlaylist}" playlist` : 'Tracks'}
              </h3>
            </div>
          )}
          <div className="home__sidebar-content">
            {loading ? (
              <div className="home__loading">
                <p>Loading music...</p>
              </div>
            ) : error ? (
              <div className="home__error">
                <p>{error}</p>
                <button onClick={loadMusicList} className="home__retry-btn">Retry</button>
              </div>
            ) : filteredMusicList.length === 0 ? (
              <div className="home__empty">
                <p>{showFavorites ? 'No favorite tracks found.' : 'No music tracks found.'}</p>
                <p className="home__empty-hint">
                  {showFavorites 
                    ? 'Add songs to your favorites by clicking the heart icon!' 
                    : (
                      <>
                        For any issues, please reach out to{' '}
                        <a href="mailto:siddhantroy225@gmail.com" className="home__email-link">
                          siddhantroy225@gmail.com
                        </a>
                      </>
                    )}
                </p>
              </div>
            ) : (
              filteredMusicList.map((track) => {
                const trackIdentifier = track.uuid || track.id
                const currentTrackId = currentTrack ? (currentTrack.uuid || currentTrack.id) : null
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
                  />
                )
              })
            )}
          </div>
        </aside>
        <main className="home__main">
          {!showFavorites ? (
            <Playlist />
          ) : (
            <>
              <h4>Favorites</h4>
              {!loading && !error && searchQuery && filteredMusicList.length === 0 && (
                <p className="home__empty-hint">No tracks found matching "{searchQuery}"</p>
              )}
            </>
          )}
        </main>
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
  )
}

export default Home
