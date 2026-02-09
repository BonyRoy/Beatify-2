import React, { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import './Footer.css'

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

const PreviousIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20" />
    <line x1="5" y1="19" x2="5" y2="5" />
  </svg>
)

const NextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
)

const MusicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SpinnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
    <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="30" />
  </svg>
)

const Footer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime,
    duration,
    volume,
    togglePlayPause,
    seekTo,
    setVolumeLevel,
    updateTime,
    updateDuration,
    setPlaying,
    playNextTrack,
    playPreviousTrack
  } = usePlayer()

  const audioRef = useRef(null)
  const progressBarRef = useRef(null)
  const volumeBarRef = useRef(null)
  const shouldAutoResumeRef = useRef(false)
  const currentSrcRef = useRef(null)
  const isSourceChangingRef = useRef(false)
  const titleRef = useRef(null)
  const artistRef = useRef(null)
  const albumRef = useRef(null)
  const isDraggingProgressRef = useRef(false)
  const isDraggingVolumeRef = useRef(false)
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false)
  const [shouldScrollArtist, setShouldScrollArtist] = useState(false)
  const [shouldScrollAlbum, setShouldScrollAlbum] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      // Auto-exit full screen if resizing to desktop
      if (window.innerWidth > 768) {
        setIsFullScreen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Add/remove body class when fullscreen
  useEffect(() => {
    if (isFullScreen && isMobile) {
      document.body.classList.add('footer-fullscreen-active')
    } else {
      document.body.classList.remove('footer-fullscreen-active')
    }
    return () => {
      document.body.classList.remove('footer-fullscreen-active')
    }
  }, [isFullScreen, isMobile])

  // Handle footer click to toggle full-screen player (mobile only)
  const handleFooterClick = (e) => {
    if (!isMobile || !currentTrack) return
    
    // Don't toggle if clicking on speed menu
    if (e.target.closest('.player__speed-menu')) {
      return
    }
    
    // In full-screen mode, close when clicking outside controls
    if (isFullScreen) {
      // Close speed menu if open
      if (showSpeedMenu) {
        setShowSpeedMenu(false)
        return
      }
      // Don't close if clicking on controls, progress bar, or extra controls
      if (e.target.closest('.player__fullscreen-controls') || 
          e.target.closest('.player__fullscreen-progress') ||
          e.target.closest('.player__progress-bar') ||
          e.target.closest('.player__fullscreen-extra-controls')) {
        return
      }
      setIsFullScreen(false)
    } else {
      // In regular mode, open full-screen when clicking on left section
      // Don't open if clicking on controls
      if (e.target.closest('.player__center') || e.target.closest('.player__right')) {
        return
      }
      setIsFullScreen(true)
    }
  }

  // Update audio source when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      const audioUrl = currentTrack.fileUrl || currentTrack.url
      if (audioUrl && audioUrl !== currentSrcRef.current) {
        isSourceChangingRef.current = true
        currentSrcRef.current = audioUrl
        audioRef.current.pause()
        audioRef.current.src = audioUrl
        audioRef.current.load()
        updateTime(0)
        
        // Reset flag after a short delay
        setTimeout(() => {
          isSourceChangingRef.current = false
        }, 100)
      }
    } else if (!currentTrack) {
      currentSrcRef.current = null
      setIsLoading(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [currentTrack, updateTime])

  // Handle play/pause state changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    
    // Don't try to play if source is currently changing
    if (isSourceChangingRef.current) {
      return
    }

    if (isPlaying) {
      // Only play if audio is ready
      const attemptPlay = () => {
        if (audio.paused && isPlaying && !isSourceChangingRef.current) {
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing audio:', error)
              setPlaying(false)
            })
          }
        }
      }

      if (audio.readyState >= 2) {
        attemptPlay()
      } else {
        const handleCanPlay = () => {
          attemptPlay()
        }
        audio.addEventListener('canplay', handleCanPlay, { once: true })
        
        return () => {
          audio.removeEventListener('canplay', handleCanPlay)
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause()
      }
    }
  }, [isPlaying, currentTrack, setPlaying])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Handle time updates
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      updateTime(audioRef.current.currentTime)
    }
  }, [updateTime])

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      updateDuration(audioRef.current.duration)
      setIsLoading(false)
    }
  }, [updateDuration])

  // Handle load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
  }, [])

  // Handle can play (audio is ready)
  const handleCanPlay = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Handle ended - auto-play next track
  const handleEnded = useCallback(() => {
    setPlaying(false)
    updateTime(0)
    // Auto-play next track
    playNextTrack()
  }, [setPlaying, updateTime, playNextTrack])

  // Handle pause event
  const handlePause = useCallback(() => {
    if (isPlaying && currentTrack) {
      shouldAutoResumeRef.current = true
    } else {
      shouldAutoResumeRef.current = false
    }
  }, [isPlaying, currentTrack])

  // Handle play event
  const handlePlay = useCallback(() => {
    shouldAutoResumeRef.current = false
    setPlaying(true)
  }, [setPlaying])

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Handle speed change
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed)
    setShowSpeedMenu(false)
  }

  const speedOptions = [0.25, 0.5, 1, 1.5, 2]

  // Handle visibility change (when app comes back to foreground after call)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        return
      }

      if (
        document.visibilityState === 'visible' &&
        shouldAutoResumeRef.current &&
        isPlaying &&
        currentTrack &&
        audioRef.current
      ) {
        setTimeout(() => {
          if (
            audioRef.current &&
            shouldAutoResumeRef.current &&
            isPlaying &&
            currentTrack &&
            audioRef.current.paused &&
            document.visibilityState === 'visible'
          ) {
            audioRef.current.play().catch(error => {
              console.error('Error resuming audio after interruption:', error)
              shouldAutoResumeRef.current = false
            })
          }
        }, 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPlaying, currentTrack])

  // Handle audio interruptions
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleSuspend = () => {
      if (isPlaying && currentTrack) {
        shouldAutoResumeRef.current = true
      }
    }

    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('suspend', handleSuspend)

    return () => {
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('suspend', handleSuspend)
    }
  }, [isPlaying, currentTrack, handlePause, handlePlay])

  // Media Session API for background playback and system controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return // Media Session API not supported
    }

    const mediaSession = navigator.mediaSession

    // Update metadata when track changes
    if (currentTrack) {
      const albumArtUrl = currentTrack.coverUrl || currentTrack.artworkUrl || currentTrack.albumArtUrl
      
      mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || '',
        artwork: albumArtUrl ? [
          { src: albumArtUrl, sizes: '96x96', type: 'image/png' },
          { src: albumArtUrl, sizes: '128x128', type: 'image/png' },
          { src: albumArtUrl, sizes: '192x192', type: 'image/png' },
          { src: albumArtUrl, sizes: '256x256', type: 'image/png' },
          { src: albumArtUrl, sizes: '384x384', type: 'image/png' },
          { src: albumArtUrl, sizes: '512x512', type: 'image/png' }
        ] : []
      })
    } else {
      mediaSession.metadata = null
    }

    // Set action handlers
    try {
      mediaSession.setActionHandler('play', () => {
        if (audioRef.current && currentTrack) {
          audioRef.current.play().catch(error => {
            console.error('Error playing from media session:', error)
            setPlaying(false)
          })
          // Don't call togglePlayPause - let the audio play event handle state
        }
      })

      mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause()
          // Don't call togglePlayPause - let the audio pause event handle state
        }
      })

      mediaSession.setActionHandler('previoustrack', () => {
        playPreviousTrack()
      })

      mediaSession.setActionHandler('nexttrack', () => {
        playNextTrack()
      })

      mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          const seekTime = details.seekTime
          audioRef.current.currentTime = seekTime
          seekTo(seekTime)
        }
      })

      // Optional: Seek backward/forward
      mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime)
          seekTo(audioRef.current.currentTime)
        }
      })

      mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current && duration) {
          const skipTime = details.seekOffset || 10
          audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + skipTime)
          seekTo(audioRef.current.currentTime)
        }
      })
    } catch (error) {
      console.error('Error setting media session action handlers:', error)
    }

    // Update playback state
    const updatePlaybackState = () => {
      if (mediaSession.setPlaybackState) {
        mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
      }
    }
    updatePlaybackState()

    // Update position state for scrubbing
    const updatePositionState = () => {
      if (mediaSession.setPositionState && audioRef.current && duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
        try {
          mediaSession.setPositionState({
            duration: duration,
            playbackRate: playbackSpeed,
            position: audioRef.current.currentTime || currentTime
          })
        } catch (error) {
          // Some browsers may not support setPositionState
          // This is expected on some mobile browsers
        }
      }
    }

    // Update position state when time changes
    if (isPlaying && currentTrack && duration > 0) {
      updatePositionState()
    }

    // Update position state periodically for accurate scrubbing
    const positionUpdateInterval = setInterval(() => {
      if (isPlaying && currentTrack && audioRef.current && duration > 0) {
        updatePositionState()
      }
    }, 500) // Update more frequently for smoother scrubbing

    return () => {
      clearInterval(positionUpdateInterval)
      // Clear action handlers
      try {
        mediaSession.setActionHandler('play', null)
        mediaSession.setActionHandler('pause', null)
        mediaSession.setActionHandler('previoustrack', null)
        mediaSession.setActionHandler('nexttrack', null)
        mediaSession.setActionHandler('seekto', null)
        mediaSession.setActionHandler('seekbackward', null)
        mediaSession.setActionHandler('seekforward', null)
      } catch (error) {
        // Ignore errors when clearing handlers
      }
    }
  }, [currentTrack, isPlaying, currentTime, duration, playbackSpeed, playNextTrack, playPreviousTrack, seekTo, setPlaying])

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  // Update progress based on clientX position
  const updateProgress = useCallback((clientX) => {
    if (!progressBarRef.current || !duration || !audioRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * duration
    audioRef.current.currentTime = newTime
    seekTo(newTime)
  }, [duration, seekTo])

  // Handle progress bar start (mouse down or touch start)
  const handleProgressStart = useCallback((e) => {
    if (e.touches) {
      e.preventDefault() // Prevent scrolling on iOS
      e.stopPropagation() // Prevent event bubbling
      e.stopImmediatePropagation() // Prevent other handlers
    }
    isDraggingProgressRef.current = true
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateProgress(clientX)
  }, [updateProgress])

  // Handle progress bar move (mouse move or touch move)
  const handleProgressMove = useCallback((e) => {
    if (!isDraggingProgressRef.current) return
    e.preventDefault()
    e.stopPropagation()
    if (e.touches) {
      e.stopImmediatePropagation() // Prevent other handlers on iOS
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateProgress(clientX)
  }, [updateProgress])

  // Handle progress bar end (mouse up or touch end)
  const handleProgressEnd = useCallback(() => {
    isDraggingProgressRef.current = false
  }, [])

  // Handle progress bar cancel (touch cancelled)
  const handleProgressCancel = useCallback(() => {
    isDraggingProgressRef.current = false
  }, [])

  // Handle progress bar click
  const handleProgressClick = useCallback((e) => {
    if (!isDraggingProgressRef.current) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      updateProgress(clientX)
    }
  }, [updateProgress])

  // Add global event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingProgressRef.current) {
        handleProgressMove(e)
      }
    }
    const handleMouseUp = () => {
      if (isDraggingProgressRef.current) {
        handleProgressEnd()
      }
    }
    const handleTouchMove = (e) => {
      if (isDraggingProgressRef.current) {
        handleProgressMove(e)
      }
    }
    const handleTouchEnd = () => {
      if (isDraggingProgressRef.current) {
        handleProgressEnd()
      }
    }
    const handleTouchCancel = () => {
      if (isDraggingProgressRef.current) {
        handleProgressCancel()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // Use capture phase for touch events on iOS for better control
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    document.addEventListener('touchend', handleTouchEnd, { capture: true })
    document.addEventListener('touchcancel', handleTouchCancel, { capture: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove, { capture: true })
      document.removeEventListener('touchend', handleTouchEnd, { capture: true })
      document.removeEventListener('touchcancel', handleTouchCancel, { capture: true })
    }
  }, [handleProgressMove, handleProgressEnd, handleProgressCancel])

  // Update volume based on clientX position
  const updateVolume = useCallback((clientX) => {
    if (!volumeBarRef.current) return
    const rect = volumeBarRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    // Update both state and audio element immediately for responsive feedback
    setVolumeLevel(percentage)
    if (audioRef.current) {
      audioRef.current.volume = percentage
    }
  }, [setVolumeLevel])

  // Handle volume bar start (mouse down or touch start)
  const handleVolumeStart = useCallback((e) => {
    e.stopPropagation()
    if (e.touches) {
      e.preventDefault() // Prevent scrolling on iOS
      e.stopImmediatePropagation() // Prevent other handlers
    }
    isDraggingVolumeRef.current = true
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateVolume(clientX)
  }, [updateVolume])

  // Handle volume bar move (mouse move or touch move)
  const handleVolumeMove = useCallback((e) => {
    if (!isDraggingVolumeRef.current) return
    e.preventDefault()
    e.stopPropagation()
    if (e.touches) {
      e.stopImmediatePropagation() // Prevent other handlers on iOS
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateVolume(clientX)
  }, [updateVolume])

  // Handle volume bar end (mouse up or touch end)
  const handleVolumeEnd = useCallback(() => {
    isDraggingVolumeRef.current = false
  }, [])

  // Handle volume bar cancel (touch cancelled)
  const handleVolumeCancel = useCallback(() => {
    isDraggingVolumeRef.current = false
  }, [])

  // Handle volume bar click
  const handleVolumeClick = useCallback((e) => {
    e.stopPropagation()
    if (e.touches) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    if (!isDraggingVolumeRef.current) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      updateVolume(clientX)
    }
  }, [updateVolume])

  // Add global event listeners for volume dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingVolumeRef.current) {
        handleVolumeMove(e)
      }
    }
    const handleMouseUp = () => {
      if (isDraggingVolumeRef.current) {
        handleVolumeEnd()
      }
    }
    const handleTouchMove = (e) => {
      if (isDraggingVolumeRef.current) {
        handleVolumeMove(e)
      }
    }
    const handleTouchEnd = () => {
      if (isDraggingVolumeRef.current) {
        handleVolumeEnd()
      }
    }
    const handleTouchCancel = () => {
      if (isDraggingVolumeRef.current) {
        handleVolumeCancel()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // Use capture phase for touch events on iOS for better control
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    document.addEventListener('touchend', handleTouchEnd, { capture: true })
    document.addEventListener('touchcancel', handleTouchCancel, { capture: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove, { capture: true })
      document.removeEventListener('touchend', handleTouchEnd, { capture: true })
      document.removeEventListener('touchcancel', handleTouchCancel, { capture: true })
    }
  }, [handleVolumeMove, handleVolumeEnd, handleVolumeCancel])

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSpeedMenu && !e.target.closest('.player__fullscreen-speed') && !e.target.closest('.player__speed')) {
        setShowSpeedMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showSpeedMenu])

  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      // Use requestAnimationFrame and setTimeout to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (titleRef.current) {
            const titleEl = titleRef.current
            const wrapperEl = titleEl.closest('.player__title-wrapper')
            if (wrapperEl) {
              const isOverflowing = titleEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollTitle(isOverflowing)
            }
          }
          if (artistRef.current) {
            const artistEl = artistRef.current
            const wrapperEl = artistEl.closest('.player__artist-wrapper')
            if (wrapperEl) {
              const isOverflowing = artistEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollArtist(isOverflowing)
            }
          }
          if (albumRef.current) {
            const albumEl = albumRef.current
            const contentEl = albumEl.closest('.player__album-content')
            if (contentEl) {
              const isOverflowing = albumEl.scrollWidth > contentEl.offsetWidth + 5
              setShouldScrollAlbum(isOverflowing)
            }
          }
        }, 200)
      })
    }

    checkOverflow()
    const resizeHandler = () => checkOverflow()
    window.addEventListener('resize', resizeHandler)
    window.addEventListener('load', checkOverflow)
    return () => {
      window.removeEventListener('resize', resizeHandler)
      window.removeEventListener('load', checkOverflow)
    }
  }, [currentTrack])

  // Get album art URL - check multiple possible field names
  const albumArtUrl = currentTrack?.coverUrl || currentTrack?.artworkUrl || currentTrack?.albumArtUrl

  if (!currentTrack) {
    return (
      <footer className="footer footer--empty">
        <p className="footer__text">© 2026 Beatify. All rights reserved.</p>
      </footer>
    )
  }

  return (
    <>
      <footer className={`footer footer--player ${isFullScreen ? 'footer--fullscreen' : ''}`} onClick={!isFullScreen ? handleFooterClick : handleFooterClick}>
        {/* Close Button - positioned on footer */}
        {isFullScreen && (
          <button 
            className="player__fullscreen-close"
            onClick={(e) => {
              e.stopPropagation()
              setIsFullScreen(false)
            }}
            aria-label="Close full-screen player"
          >
            <CloseIcon />
          </button>
        )}
        <div className={`player ${isFullScreen ? 'player--fullscreen' : ''}`}>
        {isFullScreen ? (
          <>
            {/* Full-screen layout */}
            <div className="player__fullscreen-content">
              {/* Album Art */}
              <div className="player__fullscreen-art-wrapper">
                {albumArtUrl ? (
                  <img className="player__fullscreen-art" src={albumArtUrl} alt={`${currentTrack.name} album art`} />
                ) : (
                  <div className="player__fullscreen-art player__fullscreen-art--placeholder">
                    <MusicIcon />
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="player__fullscreen-info">
                <h3 className="player__fullscreen-title">{currentTrack.name || 'Unknown Track'}</h3>
                <p className="player__fullscreen-artist">{currentTrack.artist || 'Unknown Artist'}</p>
              </div>

              {/* Progress Bar */}
              <div className="player__fullscreen-progress">
                <span className="player__time">{formatTime(currentTime)}</span>
                <div 
                  className="player__progress-bar" 
                  ref={progressBarRef}
                  onClick={handleProgressClick}
                  onMouseDown={handleProgressStart}
                  onTouchStart={handleProgressStart}
                  onTouchCancel={handleProgressCancel}
                  style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                >
                  <div className="player__progress-fill" style={{ width: `${progressPercentage}%` }} />
                  <div className="player__progress-handle" style={{ left: `${progressPercentage}%` }} />
                </div>
                <span className="player__time">-{formatTime(duration - currentTime)}</span>
              </div>

              {/* Playback Controls */}
              <div className="player__fullscreen-controls">
                <button 
                  className="player__control-btn player__control-btn--fullscreen" 
                  onClick={(e) => {
                    e.stopPropagation()
                    playPreviousTrack()
                  }}
                  aria-label="Previous track"
                >
                  <PreviousIcon />
                </button>
                <button 
                  className="player__control-btn player__control-btn--play player__control-btn--fullscreen-play" 
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePlayPause()
                  }}
                  disabled={isLoading}
                  aria-label={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoading ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button 
                  className="player__control-btn player__control-btn--fullscreen" 
                  onClick={(e) => {
                    e.stopPropagation()
                    playNextTrack()
                  }}
                  aria-label="Next track"
                >
                  <NextIcon />
                </button>
              </div>

              {/* Volume and Speed Controls */}
              <div className="player__fullscreen-extra-controls">
                {/* Volume Control */}
                <div className="player__fullscreen-volume">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <div 
                    className="player__volume-bar player__volume-bar--fullscreen" 
                    ref={volumeBarRef}
                    onClick={handleVolumeClick}
                    onMouseDown={handleVolumeStart}
                    onTouchStart={handleVolumeStart}
                    onTouchCancel={handleVolumeCancel}
                    style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  >
                    <div className="player__volume-fill" style={{ width: `${volume * 100}%` }} />
                  </div>
                </div>

                {/* Speed Control */}
                <div className="player__fullscreen-speed">
                  <button 
                    className="player__speed-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSpeedMenu(!showSpeedMenu)
                    }}
                  >
                    {playbackSpeed}x
                  </button>
                  {showSpeedMenu && (
                    <div className="player__speed-menu" onClick={(e) => e.stopPropagation()}>
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          className={`player__speed-option ${playbackSpeed === speed ? 'player__speed-option--active' : ''}`}
                          onClick={() => handleSpeedChange(speed)}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Regular footer layout */}
            {/* Left: Album Art & Track Info */}
            <div className="player__left">
          {albumArtUrl ? (
            <img className="player__art" src={albumArtUrl} alt={`${currentTrack.name} album art`} />
          ) : (
            <div className="player__art player__art--placeholder">
              <MusicIcon />
            </div>
          )}
          <div className="player__info">
            <div className="player__title-wrapper">
              <div className={`player__title-inner ${shouldScrollTitle ? 'player__text--scroll' : ''}`}>
                <p 
                  ref={titleRef}
                  className="player__title"
                >
                  {currentTrack.name || 'Unknown Track'}
                </p>
                {shouldScrollTitle && (
                  <p className="player__title player__text--duplicate">
                    {currentTrack.name || 'Unknown Track'}
                  </p>
                )}
              </div>
            </div>
            <div className="player__artist-wrapper">
              <div className={`player__artist-inner ${shouldScrollArtist ? 'player__text--scroll' : ''}`}>
                <p 
                  ref={artistRef}
                  className="player__artist"
                >
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
                {shouldScrollArtist && (
                  <p className="player__artist player__text--duplicate">
                    {currentTrack.artist || 'Unknown Artist'}
                  </p>
                )}
              </div>
            </div>
            {currentTrack.album && (
              <div className="player__album-wrapper">
                <span className="player__album-label">Album:</span>
                <div className="player__album-content">
                  <div className={`player__album-inner ${shouldScrollAlbum ? 'player__text--scroll' : ''}`}>
                    <span 
                      ref={albumRef}
                      className="player__album-text"
                    >
                      {currentTrack.album}
                    </span>
                    {shouldScrollAlbum && (
                      <span className="player__album-text player__text--duplicate">
                        {currentTrack.album}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="player__center">
          <div className="player__controls">
            <button 
              className="player__control-btn" 
              onClick={(e) => {
                e.stopPropagation()
                playPreviousTrack()
              }}
              aria-label="Previous track"
            >
              <PreviousIcon />
            </button>
            <button 
              className="player__control-btn player__control-btn--play" 
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
              disabled={isLoading}
              aria-label={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button 
              className="player__control-btn" 
              onClick={(e) => {
                e.stopPropagation()
                playNextTrack()
              }}
              aria-label="Next track"
            >
              <NextIcon />
            </button>
          </div>
          <div className="player__progress">
            <span className="player__time">{formatTime(currentTime)}</span>
            <div 
              className="player__progress-bar" 
              ref={progressBarRef}
              onClick={handleProgressClick}
              onMouseDown={handleProgressStart}
              onTouchStart={handleProgressStart}
              onTouchCancel={handleProgressCancel}
              style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              <div className="player__progress-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="player__time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Additional Controls */}
        <div className="player__right">
          <div className="player__volume">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <div 
              className="player__volume-bar" 
              ref={volumeBarRef}
              onClick={handleVolumeClick}
              onMouseDown={handleVolumeStart}
              onTouchStart={handleVolumeStart}
              onTouchCancel={handleVolumeCancel}
              style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              <div className="player__volume-fill" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
          
          {/* Speed Control - Hidden on mobile */}
          {!isMobile && (
            <div className="player__speed">
              <button 
                className="player__speed-btn player__speed-btn--footer"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSpeedMenu(!showSpeedMenu)
                }}
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="player__speed-menu player__speed-menu--footer" onClick={(e) => e.stopPropagation()}>
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      className={`player__speed-option ${playbackSpeed === speed ? 'player__speed-option--active' : ''}`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        preload="auto"
        playsInline
      />
    </footer>
    </>
  )
}

export default Footer
