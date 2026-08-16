import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchMusicList, formatDuration } from '../services/musicService'

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  return formatDuration(seconds)
}

const trackKey = (track) => String(track?.uuid || track?.id || '')

/**
 * Shared glass bubble player for Feels.
 * `trackIds` is the active slide's playlist of song UUIDs.
 */
const FeelsPlayer = ({ trackIds = [], fallbackArt }) => {
  const audioRef = useRef(null)
  const [catalog, setCatalog] = useState([])
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const shuffleRef = useRef(false)

  useEffect(() => {
    shuffleRef.current = shuffle
  }, [shuffle])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tracks = await fetchMusicList()
        if (!cancelled) setCatalog(tracks)
      } catch (error) {
        console.error('FeelsPlayer: failed to load music', error)
        if (!cancelled) setCatalog([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const byId = new Map(
      catalog.map((track) => [String(track.uuid || track.id), track])
    )
    const nextQueue = (trackIds || [])
      .map((id) => byId.get(String(id)))
      .filter(Boolean)

    setQueue(nextQueue)
    setIndex(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setSheetOpen(false)

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [catalog, trackIds])

  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [sheetOpen])

  const currentTrack = queue[index] || null
  const src = currentTrack?.fileUrl || currentTrack?.url || ''

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    if (!src) {
      audio.removeAttribute('src')
      audio.load()
      return undefined
    }

    audio.src = src
    audio.load()

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }

    return undefined
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, src])

  const pickShuffleIndex = (fromIndex) => {
    if (queue.length <= 1) return 0
    let next = fromIndex
    let guard = 0
    while (next === fromIndex && guard < 12) {
      next = Math.floor(Math.random() * queue.length)
      guard += 1
    }
    return next
  }

  const playNext = () => {
    if (queue.length === 0) return
    setIndex((prev) =>
      shuffleRef.current ? pickShuffleIndex(prev) : (prev + 1) % queue.length
    )
    setIsPlaying(true)
  }

  const playPrev = () => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }
    if (queue.length === 0) return
    setIndex((prev) => (prev - 1 + queue.length) % queue.length)
    setIsPlaying(true)
  }

  const playAt = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= queue.length) return
    setIndex(nextIndex)
    setIsPlaying(true)
    setSheetOpen(false)
  }

  const togglePlay = () => {
    if (!currentTrack) return
    setIsPlaying((prev) => !prev)
  }

  const toggleShuffle = () => {
    if (queue.length === 0) return
    setShuffle((prev) => {
      const next = !prev
      if (next && !isPlaying && currentTrack) {
        setIsPlaying(true)
      }
      return next
    })
  }

  const handleSeek = (event) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const next = Number(event.target.value)
    audio.currentTime = next
    setCurrentTime(next)
  }

  const art =
    currentTrack?.coverUrl ||
    currentTrack?.albumArt ||
    fallbackArt ||
    ''

  const title = currentTrack?.name || (loading ? 'Loading…' : 'No tracks')
  const artist = currentTrack
    ? currentTrack.artist || 'Unknown artist'
    : trackIds.length
      ? 'Tracks not found'
      : 'Add song UUIDs'

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`feels-player ${sheetOpen ? 'feels-player--sheet-open' : ''}`}
      role="region"
      aria-label="Music player"
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={playNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="feels-player__bubble">
        <div
          className="feels-player__art"
          style={art ? { backgroundImage: `url(${art})` } : undefined}
          aria-hidden="true"
        />

        <div className="feels-player__meta">
          <p className="feels-player__title">{title}</p>
          <p className="feels-player__artist">{artist}</p>
        </div>

        <div className="feels-player__controls">
          <button
            type="button"
            className="feels-player__btn"
            onClick={playPrev}
            aria-label="Previous"
            disabled={!currentTrack}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="feels-player__btn feels-player__btn--play"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!currentTrack}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="feels-player__btn"
            onClick={playNext}
            aria-label="Next"
            disabled={!currentTrack}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16 6h2v12h-2V6zM5 18l8.5-6L5 6v12z"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`feels-player__btn ${sheetOpen ? 'feels-player__btn--active' : ''}`}
            onClick={() => setSheetOpen(true)}
            aria-label="Open playlist"
            aria-expanded={sheetOpen}
            disabled={queue.length === 0}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 5h12v2H3V5zm0 6h12v2H3v-2zm0 6h8v2H3v-2zm14-1.5v-3.17c.31-.13.65-.22 1-.28V16.5a2.5 2.5 0 1 1-1-2zM19 3v2.18c.31.05.63.13.93.25L21 4.2 19.8 3 19 3zm-2.5 5.5A2.5 2.5 0 1 0 19 6a2.5 2.5 0 0 0-2.5 2.5z"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`feels-player__btn ${shuffle ? 'feels-player__btn--active' : ''}`}
            onClick={toggleShuffle}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
            aria-pressed={shuffle}
            disabled={queue.length === 0}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
              />
            </svg>
          </button>
        </div>

        <div className="feels-player__timeline">
          <input
            className="feels-player__range"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label="Seek"
            disabled={!currentTrack}
            style={{ '--feels-progress': `${progress}%` }}
          />
          <div className="feels-player__times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {sheetOpen &&
        createPortal(
          <div className="feels-sheet" role="dialog" aria-modal="true" aria-label="Playlist">
            <button
              type="button"
              className="feels-sheet__backdrop"
              aria-label="Close playlist"
              onClick={() => setSheetOpen(false)}
            />
            <div className="feels-sheet__panel">
              <div className="feels-sheet__handle" aria-hidden="true" />
              <div className="feels-sheet__header">
                <h2 className="feels-sheet__title">Up next</h2>
                <p className="feels-sheet__count">{queue.length} songs</p>
                <button
                  type="button"
                  className="feels-sheet__close"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.42 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.42-6.29-6.3 6.3-6.29z"
                    />
                  </svg>
                </button>
              </div>
              <ul className="feels-sheet__list">
                {queue.map((track, trackIndex) => {
                  const active = trackIndex === index
                  const rowArt =
                    track.coverUrl || track.albumArt || fallbackArt || ''
                  return (
                    <li key={`${trackKey(track)}-${trackIndex}`}>
                      <button
                        type="button"
                        className={`feels-sheet__row ${active ? 'feels-sheet__row--active' : ''}`}
                        onClick={() => playAt(trackIndex)}
                      >
                        <span
                          className="feels-sheet__row-art"
                          style={
                            rowArt
                              ? { backgroundImage: `url(${rowArt})` }
                              : undefined
                          }
                          aria-hidden="true"
                        />
                        <span className="feels-sheet__row-meta">
                          <span className="feels-sheet__row-title">
                            {track.name || 'Untitled'}
                          </span>
                          <span className="feels-sheet__row-artist">
                            {track.artist || 'Unknown artist'}
                          </span>
                        </span>
                        {active && (
                          <span className="feels-sheet__now" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default FeelsPlayer
