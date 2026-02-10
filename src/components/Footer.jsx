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
  const pausedForCallRef = useRef(false)
  const timeBeforeCallRef = useRef(0)

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
      const currentTime = audioRef.current.currentTime
      updateTime(currentTime)
      
      // iOS: Check if track ended (ended event might not fire in background)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      
      if (isIOS && duration > 0 && currentTime >= duration - 0.5 && isPlaying) {
        // Track has ended, play next track
        setPlaying(false)
        updateTime(0)
        playNextTrack()
      }
    }
  }, [updateTime, duration, isPlaying, setPlaying, playNextTrack])

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
    // Sync state when audio is paused externally (e.g., from media session or phone call)
    if (isPlaying) {
      setPlaying(false)
      if (currentTrack && audioRef.current) {
        // On iOS, if audio is paused while we think it should be playing,
        // it might be a phone call - save the time
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        
        if (isIOS && !pausedForCallRef.current) {
          // Save current time for potential call resume
          timeBeforeCallRef.current = audioRef.current.currentTime
          pausedForCallRef.current = true
        }
        shouldAutoResumeRef.current = true
      }
    } else {
      shouldAutoResumeRef.current = false
    }
  }, [isPlaying, currentTrack, setPlaying])

  // Handle play event
  const handlePlay = useCallback(() => {
    shouldAutoResumeRef.current = false
    
    // Clear call pause state when audio actually starts playing
    if (pausedForCallRef.current) {
      pausedForCallRef.current = false
      timeBeforeCallRef.current = 0
    }
    
    setPlaying(true)
    
    // Update media session metadata when playback starts (iOS requirement)
    if ('mediaSession' in navigator && currentTrack) {
      const mediaSession = navigator.mediaSession
      const albumArtUrl = currentTrack.coverUrl || currentTrack.artworkUrl || currentTrack.albumArtUrl
      const artworkArray = albumArtUrl ? [
        { src: albumArtUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: albumArtUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: albumArtUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: albumArtUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: albumArtUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: albumArtUrl, sizes: '512x512', type: 'image/jpeg' }
      ] : []
      
      try {
        mediaSession.metadata = new MediaMetadata({
          title: currentTrack.name || 'Unknown Track',
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || '',
          artwork: artworkArray
        })
        if (mediaSession.setPlaybackState) {
          mediaSession.playbackState = 'playing'
        }
      } catch (error) {
        console.error('Error updating media session on play:', error)
      }
    }
  }, [setPlaying, currentTrack, seekTo])

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

  // Handle call interruptions - detect and resume after iPhone calls
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (!isIOS) return // Only for iOS
    
    // For iOS: Check periodically if we were paused for a call and try to resume
    const checkAndResumeAfterCall = () => {
      if (!currentTrack || !audioRef.current) return
      
      // If we were paused for a call and audio is still paused but should be playing
      if (pausedForCallRef.current && audioRef.current.paused && isPlaying) {
        // Resume from 2 seconds back
        const resumeTime = Math.max(0, timeBeforeCallRef.current - 2)
        
        // Set time first
        audioRef.current.currentTime = resumeTime
        seekTo(resumeTime)
        
        // Wait for seek to complete, then play
        const tryPlay = () => {
          if (audioRef.current && currentTrack && pausedForCallRef.current && audioRef.current.paused) {
            const playPromise = audioRef.current.play()
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Successfully playing - clear call state
                  pausedForCallRef.current = false
                  timeBeforeCallRef.current = 0
                  setPlaying(true)
                })
                .catch(error => {
                  // If play fails, might still be in call - will retry on next interval
                  console.log('Resume after call failed, will retry:', error)
                })
            } else {
              // Play started immediately
              pausedForCallRef.current = false
              timeBeforeCallRef.current = 0
              setPlaying(true)
            }
          }
        }
        
        // Wait a bit for seek to complete
        setTimeout(tryPlay, 200)
      }
    }
    
    // Check when visibility changes (call might have ended)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure call has fully ended
        setTimeout(() => {
          checkAndResumeAfterCall()
        }, 800)
      }
    }
    
    // For iOS: Periodically check if we can resume after a call
    const resumeCheckInterval = setInterval(() => {
      checkAndResumeAfterCall()
    }, 1500) // Check every 1.5 seconds
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(resumeCheckInterval)
    }
  }, [isPlaying, currentTrack, setPlaying, seekTo])

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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    // Update metadata when track changes or when playback starts (iOS requirement)
    const updateMetadata = () => {
      if (currentTrack) {
        const albumArtUrl = currentTrack.coverUrl || currentTrack.artworkUrl || currentTrack.albumArtUrl
        
        // iOS requires artwork URLs to be absolute and properly formatted
        // Use image/jpeg for better iOS compatibility
        const artworkArray = albumArtUrl ? [
          { src: albumArtUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: albumArtUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: albumArtUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: albumArtUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: albumArtUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: albumArtUrl, sizes: '512x512', type: 'image/jpeg' }
        ] : []
        
        try {
          mediaSession.metadata = new MediaMetadata({
            title: currentTrack.name || 'Unknown Track',
            artist: currentTrack.artist || 'Unknown Artist',
            album: currentTrack.album || '',
            artwork: artworkArray
          })
          
          // iOS: Update playback state when metadata is set
          if (isIOS && mediaSession.setPlaybackState && audioRef.current) {
            mediaSession.playbackState = audioRef.current.paused ? 'paused' : 'playing'
          }
        } catch (error) {
          console.error('Error setting media session metadata:', error)
        }
      } else {
        mediaSession.metadata = null
      }
    }

    // Update metadata immediately when track changes
    updateMetadata()
    
    // Also update metadata when playback starts (iOS requirement)
    if (isPlaying && currentTrack && audioRef.current && !audioRef.current.paused) {
      // Delay slightly for iOS to ensure audio is ready
      setTimeout(() => updateMetadata(), isIOS ? 200 : 0)
    }

    // Set action handlers - iOS requires these to be set every time
    const setupActionHandlers = () => {
      try {
        // Clear existing handlers first (iOS requirement)
        mediaSession.setActionHandler('play', null)
        mediaSession.setActionHandler('pause', null)
        mediaSession.setActionHandler('previoustrack', null)
        mediaSession.setActionHandler('nexttrack', null)
        
        // Set play handler
        mediaSession.setActionHandler('play', () => {
          if (audioRef.current && currentTrack && !isPlaying) {
            // Simply toggle play/pause - let existing useEffect handle the actual playback
            togglePlayPause()
          }
        })

        // Set pause handler
        mediaSession.setActionHandler('pause', () => {
          if (audioRef.current && isPlaying) {
            // Simply toggle play/pause - let existing useEffect handle the actual pause
            togglePlayPause()
          }
        })

        // Set previous track handler
        mediaSession.setActionHandler('previoustrack', () => {
          if (currentTrack) {
            playPreviousTrack()
            // Update metadata after track change (iOS needs delay)
            setTimeout(() => {
              updateMetadata()
              if (mediaSession.setPlaybackState && audioRef.current) {
                mediaSession.playbackState = audioRef.current.paused ? 'paused' : 'playing'
              }
            }, isIOS ? 300 : 100)
          }
        })

        // Set next track handler
        mediaSession.setActionHandler('nexttrack', () => {
          if (currentTrack) {
            playNextTrack()
            // Update metadata after track change (iOS needs delay)
            setTimeout(() => {
              updateMetadata()
              if (mediaSession.setPlaybackState && audioRef.current) {
                mediaSession.playbackState = audioRef.current.paused ? 'paused' : 'playing'
              }
            }, isIOS ? 300 : 100)
          }
        })

        // Set seek handlers
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
    }
    
    // Setup handlers
    setupActionHandlers()

    // Update playback state - iOS requires frequent updates
    const updatePlaybackState = () => {
      if (mediaSession.setPlaybackState && audioRef.current) {
        // Use actual audio state for iOS compatibility
        const actualState = audioRef.current.paused ? 'paused' : 'playing'
        mediaSession.playbackState = actualState
      }
    }
    
    // Update immediately
    updatePlaybackState()

    // Update position state for scrubbing
    const updatePositionState = () => {
      if (mediaSession.setPositionState && audioRef.current && duration > 0 && !isNaN(duration)) {
        try {
          const currentPos = audioRef.current.currentTime || currentTime
          if (!isNaN(currentPos)) {
            mediaSession.setPositionState({
              duration: duration,
              playbackRate: playbackSpeed,
              position: currentPos
            })
          }
        } catch (error) {
          // Some browsers may not support setPositionState
          // This is expected on some mobile browsers
        }
      }
    }

    // Update position state when time changes
    if (isPlaying && currentTrack && duration > 0 && audioRef.current && !audioRef.current.paused) {
      updatePositionState()
    }

    // Update playback state and position state periodically (iOS requirement)
    const stateUpdateInterval = setInterval(() => {
      if (currentTrack && audioRef.current) {
        updatePlaybackState()
        if (duration > 0 && !audioRef.current.paused) {
          updatePositionState()
        }
      }
    }, 500) // Update frequently for iOS compatibility

    return () => {
      clearInterval(stateUpdateInterval)
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
  }, [currentTrack, isPlaying, currentTime, duration, playbackSpeed, playNextTrack, playPreviousTrack, seekTo, setPlaying, togglePlayPause])

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
    isDraggingProgressRef.current = true
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateProgress(clientX)
  }, [updateProgress])

  // Handle progress bar move (mouse move or touch move)
  const handleProgressMove = useCallback((e) => {
    if (!isDraggingProgressRef.current) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateProgress(clientX)
  }, [updateProgress])

  // Handle progress bar end (mouse up or touch end)
  const handleProgressEnd = useCallback(() => {
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
    const handleMouseMove = (e) => handleProgressMove(e)
    const handleMouseUp = () => handleProgressEnd()
    const handleTouchMove = (e) => handleProgressMove(e)
    const handleTouchEnd = () => handleProgressEnd()

    if (isDraggingProgressRef.current) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleProgressMove, handleProgressEnd])

  // Update volume based on clientX position
  const updateVolume = useCallback((clientX) => {
    if (!volumeBarRef.current) return
    const rect = volumeBarRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setVolumeLevel(percentage)
  }, [setVolumeLevel])

  // Handle volume bar start (mouse down or touch start)
  const handleVolumeStart = useCallback((e) => {
    e.stopPropagation()
    isDraggingVolumeRef.current = true
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateVolume(clientX)
  }, [updateVolume])

  // Handle volume bar move (mouse move or touch move)
  const handleVolumeMove = useCallback((e) => {
    if (!isDraggingVolumeRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateVolume(clientX)
  }, [updateVolume])

  // Handle volume bar end (mouse up or touch end)
  const handleVolumeEnd = useCallback(() => {
    isDraggingVolumeRef.current = false
  }, [])

  // Handle volume bar click
  const handleVolumeClick = useCallback((e) => {
    e.stopPropagation()
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

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleVolumeMove, handleVolumeEnd])

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
                  style={{ touchAction: 'none' }}
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

              {/* Speed Control */}
              <div className="player__fullscreen-extra-controls">
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
                <div className="player__album-content">
                  <div className={`player__album-inner ${shouldScrollAlbum ? 'player__text--scroll' : ''}`}>
                    <span 
                      ref={albumRef}
                      className="player__album-text"
                    >
                      from "{currentTrack.album}"
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
