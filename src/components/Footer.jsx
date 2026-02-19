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
  const fullscreenArtistRef = useRef(null)
  const isDraggingProgressRef = useRef(false)
  const isDraggingVolumeRef = useRef(false)
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false)
  const [shouldScrollArtist, setShouldScrollArtist] = useState(false)
  const [shouldScrollAlbum, setShouldScrollAlbum] = useState(false)
  const [shouldScrollFullscreenArtist, setShouldScrollFullscreenArtist] = useState(false)
  const [titleDuration, setTitleDuration] = useState(15)
  const [artistDuration, setArtistDuration] = useState(12)
  const [albumDuration, setAlbumDuration] = useState(12)
  const [fullscreenArtistDuration, setFullscreenArtistDuration] = useState(12)
  const [isLoading, setIsLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const pausedForCallRef = useRef(false)
  const pausedForMediaRef = useRef(false)
  const timeBeforeCallRef = useRef(0)
  const timeBeforeMediaRef = useRef(0)
  const hasUserInteractedRef = useRef(false)
  const nextTrackPendingRef = useRef(false)
  const isChangingTrackRef = useRef(false)
  const lastTrackChangeTimeRef = useRef(0)
  const nextTrackHandlerRef = useRef(null)
  const wasPlayingBeforeInterruptionRef = useRef(false)

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
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        
        isSourceChangingRef.current = true
        isChangingTrackRef.current = true
        lastTrackChangeTimeRef.current = Date.now()
        currentSrcRef.current = audioUrl
        const audio = audioRef.current
        audio.pause()
        audio.src = audioUrl
        audio.load()
        updateTime(0)
        
        // CRITICAL: Auto-play when track is ready
        // Store the audio URL to verify we're still on the same track
        const trackAudioUrl = audioUrl
        
        const tryStartPlayback = () => {
          const currentAudio = audioRef.current
          if (!currentAudio || currentAudio.src !== trackAudioUrl) return
          
          // Clear the flag first so play/pause effect can also work
          isSourceChangingRef.current = false
          
          // If audio is paused, try to play it (regardless of isPlaying state)
          // The play/pause effect will sync the state
          if (currentAudio.paused) {
            currentAudio.play()
              .then(() => {
                // Success - ensure playing state is set
                setPlaying(true)
              })
              .catch((error) => {
                console.error('Error playing audio after load:', error)
                // Don't set playing to false here - let play/pause effect handle it
              })
          }
        }
        
        // Set up event listeners BEFORE load() to catch ready events
        audio.addEventListener('canplay', tryStartPlayback, { once: true })
        audio.addEventListener('loadeddata', tryStartPlayback, { once: true })
        audio.addEventListener('canplaythrough', tryStartPlayback, { once: true })
        
        // Also try immediately if already ready
        if (audio.readyState >= 2) {
          setTimeout(tryStartPlayback, 100)
        }
        
        // Fallback: try after delays to ensure playback starts
        setTimeout(tryStartPlayback, 300)
        setTimeout(tryStartPlayback, 800)
        
        // Final fallback - clear flag after 1.5s so play/pause effect can handle it
        setTimeout(() => {
          if (isSourceChangingRef.current) {
            isSourceChangingRef.current = false
          }
        }, 1500)
        
        // Keep isChangingTrackRef for a bit longer to prevent rapid skipping
        setTimeout(() => {
          isChangingTrackRef.current = false
        }, 1500)
      }
    } else if (!currentTrack) {
      currentSrcRef.current = null
      setIsLoading(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [currentTrack, updateTime, isPlaying, setPlaying])

  // Handle play/pause state changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    
    // If source is changing, wait a bit then try again
    if (isSourceChangingRef.current) {
      // Wait for source to finish loading, then retry
      const checkAndPlay = setTimeout(() => {
        if (!isSourceChangingRef.current && audio && isPlaying && audio.paused) {
          audio.play()
            .then(() => {
              setPlaying(true)
            })
            .catch((error) => {
              console.error('Error playing after source change:', error)
            })
        }
      }, 500)
      return () => clearTimeout(checkAndPlay)
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (isPlaying) {
      // Only play if audio is ready
      const attemptPlay = (retryCount = 0) => {
        if (audio.paused && isPlaying && !isSourceChangingRef.current) {
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                nextTrackPendingRef.current = false
                // iOS: Verify it's actually playing
                if (isIOS) {
                  setTimeout(() => {
                    if (audio && audio.paused && isPlaying && retryCount < 2) {
                      // Still paused, retry once more
                      attemptPlay(retryCount + 1)
                    }
                  }, 300)
                }
              })
              .catch(error => {
                console.error('Error playing audio:', error)
                // On iOS, retry if it's a background play issue
                if (isIOS && retryCount < 2 && nextTrackPendingRef.current) {
                  setTimeout(() => {
                    if (audio && isPlaying && !isSourceChangingRef.current) {
                      attemptPlay(retryCount + 1)
                    }
                  }, 500)
                } else {
                  setPlaying(false)
                  nextTrackPendingRef.current = false
                }
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
    }
  }, [updateTime])

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      updateDuration(audioRef.current.duration)
      setIsLoading(false)
      
      // iOS: If should be playing and track just loaded, force play
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      
      if (isIOS && isPlaying && nextTrackPendingRef.current && audioRef.current.paused) {
        setTimeout(() => {
          if (audioRef.current && isPlaying && audioRef.current.paused && !isSourceChangingRef.current) {
            audioRef.current.play()
              .then(() => {
                nextTrackPendingRef.current = false
              })
              .catch(() => {
                // Will retry in play/pause handler
              })
          }
        }, 200)
      }
    }
  }, [updateDuration, isPlaying])

  // Handle load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
  }, [])

  // Handle can play (audio is ready) - CRITICAL for iOS background autoplay
  const handleCanPlay = useCallback(() => {
    setIsLoading(false)
    
    // iOS: If should be playing and audio is ready, force play (especially for next track)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (isIOS && isPlaying && audioRef.current && audioRef.current.paused && !isSourceChangingRef.current) {
      // This is crucial for background playback - when new track is ready, play it
      // Use aggressive retry for iOS background
      const attemptPlay = (retry = 0) => {
        setTimeout(() => {
          if (audioRef.current && isPlaying && audioRef.current.paused && !isSourceChangingRef.current) {
            audioRef.current.play()
              .then(() => {
                nextTrackPendingRef.current = false
                // Update Media Session state
                if ('mediaSession' in navigator && navigator.mediaSession.setPlaybackState) {
                  navigator.mediaSession.playbackState = 'playing'
                }
              })
              .catch(() => {
                // Retry multiple times for iOS background
                if (retry < 4) {
                  attemptPlay(retry + 1)
                } else {
                  nextTrackPendingRef.current = false
                }
              })
          }
        }, retry * 200 + 100)
      }
      
      attemptPlay()
    }
  }, [isPlaying])

  // Handle ended - auto-play next track
  const handleEnded = useCallback(() => {
    // Prevent multiple triggers
    if (isChangingTrackRef.current) return
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    isChangingTrackRef.current = true
    lastTrackChangeTimeRef.current = Date.now()
    setPlaying(false)
    updateTime(0)
    
    nextTrackPendingRef.current = true
    hasUserInteractedRef.current = true
    
    // CRITICAL for iOS: Use Media Session API handler if available
    // This is the workaround for iOS background autoplay bug
    if (isIOS && 'mediaSession' in navigator && nextTrackHandlerRef.current) {
      // Call the stored handler directly - iOS respects Media Session handlers more
      try {
        nextTrackHandlerRef.current()
      } catch (e) {
        // Fallback
        playNextTrack()
      }
    } else {
      playNextTrack()
    }
    
    // Clear flag after delay
    setTimeout(() => {
      isChangingTrackRef.current = false
    }, 2000)
  }, [setPlaying, updateTime, playNextTrack])

  // Handle pause event
  const handlePause = useCallback(() => {
    // Sync state when audio is paused externally (e.g., from media session, phone call, or other media)
    if (isPlaying && currentTrack && audioRef.current && !isSourceChangingRef.current) {
      const isPageHidden = document.hidden || document.visibilityState === 'hidden'
      const wasPlaying = wasPlayingBeforeInterruptionRef.current || isPlaying
      
      // Save that we were playing before interruption
      wasPlayingBeforeInterruptionRef.current = true
      
      // Detect phone call: page is hidden (user switched to phone app)
      if (isPageHidden && !pausedForCallRef.current) {
        timeBeforeCallRef.current = audioRef.current.currentTime
        pausedForCallRef.current = true
        shouldAutoResumeRef.current = true
        setPlaying(false)
      }
      // Detect other media interruption: page is visible but audio was paused externally
      else if (!isPageHidden && !pausedForCallRef.current && !pausedForMediaRef.current && wasPlaying) {
        timeBeforeMediaRef.current = audioRef.current.currentTime
        pausedForMediaRef.current = true
        shouldAutoResumeRef.current = true
        setPlaying(false)
      }
      // If already tracking an interruption, just update state
      else if (wasPlaying) {
        setPlaying(false)
        shouldAutoResumeRef.current = true
      }
    } else {
      // User manually paused or no track
      shouldAutoResumeRef.current = false
      wasPlayingBeforeInterruptionRef.current = false
    }
  }, [isPlaying, currentTrack, setPlaying])

  // Handle play event
  const handlePlay = useCallback(() => {
    shouldAutoResumeRef.current = false
    
    // Clear interruption states when audio actually starts playing
    if (pausedForCallRef.current) {
      pausedForCallRef.current = false
      timeBeforeCallRef.current = 0
    }
    if (pausedForMediaRef.current) {
      pausedForMediaRef.current = false
      timeBeforeMediaRef.current = 0
    }
    
    wasPlayingBeforeInterruptionRef.current = false
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

  // iOS Background Monitoring - Aggressive workaround for background limitations
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (!isIOS) return // Only for iOS
    
    let lastCheckedTime = 0
    let lastTrackId = null
    let resumeAttempted = false
    
    // Comprehensive background monitor
    const iosBackgroundMonitor = () => {
      if (!currentTrack || !audioRef.current) return
      
      const currentTrackId = currentTrack.uuid || currentTrack.id
      const audio = audioRef.current
      const now = Date.now()
      const timeSinceTrackChange = now - lastTrackChangeTimeRef.current
      
      // Prevent rapid track changes - wait at least 2 seconds after track change
      if (isChangingTrackRef.current || timeSinceTrackChange < 2000) {
        return
      }
      
      // 1. Check if track ended (for background autoplay)
      if (duration > 0 && isPlaying && !audio.paused && !isChangingTrackRef.current) {
        const currentAudioTime = audio.currentTime
        const timeRemaining = duration - currentAudioTime
        
        // If track is very close to end or past end
        if (timeRemaining <= 0.5 && !audio.dataset.ending) {
          audio.dataset.ending = 'true'
          isChangingTrackRef.current = true
          setPlaying(false)
          updateTime(0)
          
          // Mark as pending and user interacted (Media Session counts as interaction)
          nextTrackPendingRef.current = true
          hasUserInteractedRef.current = true
          lastTrackChangeTimeRef.current = now
          
          // CRITICAL: Use Media Session API's nexttrack handler - iOS respects this more
          // This is the key workaround for iOS background autoplay bug
          if ('mediaSession' in navigator && nextTrackHandlerRef.current) {
            // Call the stored handler directly - iOS respects Media Session handlers
            try {
              nextTrackHandlerRef.current()
            } catch (e) {
              // Fallback to direct call
              playNextTrack()
            }
          } else {
            // Fallback: direct call
            playNextTrack()
          }
          
          // Clear flags after delay
          setTimeout(() => {
            isChangingTrackRef.current = false
            if (audioRef.current) {
              delete audioRef.current.dataset.ending
            }
          }, 3000)
        }
      }
      
      // 2. Check for phone call resume - when page becomes visible again after being paused for call
      if (pausedForCallRef.current && audio.paused && wasPlayingBeforeInterruptionRef.current && !resumeAttempted && !isChangingTrackRef.current) {
        // Only resume if page is visible (call ended)
        if (document.visibilityState === 'visible') {
          resumeAttempted = true
          
          // Resume from 2 seconds back (or from saved time if less than 2 seconds)
          const resumeTime = Math.max(0, timeBeforeCallRef.current - 2)
          audio.currentTime = resumeTime
          seekTo(resumeTime)
          
          // Try to play
          setTimeout(() => {
            if (audio && currentTrack && pausedForCallRef.current && audio.paused) {
              audio.play()
                .then(() => {
                  pausedForCallRef.current = false
                  timeBeforeCallRef.current = 0
                  wasPlayingBeforeInterruptionRef.current = false
                  resumeAttempted = false
                  setPlaying(true)
                })
              .catch(() => {
                resumeAttempted = false
              })
            } else {
              resumeAttempted = false
            }
          }, 500)
        }
      }
      
      // 3. Check for other media interruption resume - when audio becomes available again
      if (pausedForMediaRef.current && audio.paused && wasPlayingBeforeInterruptionRef.current && !resumeAttempted && !isChangingTrackRef.current) {
        // Check if we can resume (page is visible and audio context is available)
        if (document.visibilityState === 'visible') {
          resumeAttempted = true
          
          // Resume from saved time
          const resumeTime = Math.max(0, timeBeforeMediaRef.current)
          audio.currentTime = resumeTime
          seekTo(resumeTime)
          
          // Try to play after a short delay to ensure audio context is ready
          setTimeout(() => {
            if (audio && currentTrack && pausedForMediaRef.current && audio.paused) {
              audio.play()
                .then(() => {
                  pausedForMediaRef.current = false
                  timeBeforeMediaRef.current = 0
                  wasPlayingBeforeInterruptionRef.current = false
                  resumeAttempted = false
                  setPlaying(true)
                })
              .catch(() => {
                // Retry once more after a longer delay
                setTimeout(() => {
                  if (audio && pausedForMediaRef.current && audio.paused) {
                    audio.play()
                      .then(() => {
                        pausedForMediaRef.current = false
                        timeBeforeMediaRef.current = 0
                        wasPlayingBeforeInterruptionRef.current = false
                        resumeAttempted = false
                        setPlaying(true)
                      })
                      .catch(() => {
                        resumeAttempted = false
                      })
                  } else {
                    resumeAttempted = false
                  }
                }, 1000)
              })
            } else {
              resumeAttempted = false
            }
          }, 300)
        }
      }
      
      // 4. Check if track changed but not playing (should be playing) - only if enough time has passed
      if (currentTrackId !== lastTrackId && isPlaying && audio.paused && !isSourceChangingRef.current && timeSinceTrackChange > 1000) {
        // Track changed, should be playing - try multiple times
        if (!audio.dataset.playAttempted || (now - parseInt(audio.dataset.playAttempted || '0')) > 2000) {
          audio.dataset.playAttempted = now.toString()
          
          // Try to play immediately
          audio.play()
            .then(() => {
              delete audio.dataset.playAttempted
            })
            .catch(() => {
              // Retry after delay - up to 3 times
              const retryCount = parseInt(audio.dataset.retryCount || '0')
              if (retryCount < 3) {
                audio.dataset.retryCount = (retryCount + 1).toString()
                setTimeout(() => {
                  if (audio && audio.paused && isPlaying && !isSourceChangingRef.current) {
                    audio.play()
                      .then(() => {
                        delete audio.dataset.playAttempted
                        delete audio.dataset.retryCount
                      })
                      .catch(() => {
                        delete audio.dataset.playAttempted
                        delete audio.dataset.retryCount
                      })
                  }
                }, 1000 * (retryCount + 1))
              } else {
                delete audio.dataset.playAttempted
                delete audio.dataset.retryCount
              }
            })
        }
      }
      
      // 5. Check if should be playing but isn't (general fallback)
      if (isPlaying && audio.paused && !isSourceChangingRef.current && !isChangingTrackRef.current && timeSinceTrackChange > 2000 && !pausedForCallRef.current && !pausedForMediaRef.current) {
        // Should be playing but isn't - try to start
        audio.play().catch(() => {
          // Ignore errors - will retry on next check
        })
      }
      
      lastCheckedTime = now
      if (currentTrackId !== lastTrackId) {
        lastTrackId = currentTrackId
        lastTrackChangeTimeRef.current = now
      }
    }
    
    // Run monitor frequently (every 500ms for responsive background handling)
    const monitorInterval = setInterval(iosBackgroundMonitor, 500)
    
    // Also check on visibility change (e.g., when returning from phone call)
    const handleVisibilityChange = () => {
      resumeAttempted = false
      if (document.visibilityState === 'visible') {
        // Check if we were paused for a phone call and should resume
        if (pausedForCallRef.current && audioRef.current && wasPlayingBeforeInterruptionRef.current && audioRef.current.paused) {
          const resumeTime = Math.max(0, timeBeforeCallRef.current - 2)
          audioRef.current.currentTime = resumeTime
          seekTo(resumeTime)
          
          // Try to resume playback
          setTimeout(() => {
            if (audioRef.current && pausedForCallRef.current && audioRef.current.paused) {
              audioRef.current.play()
                .then(() => {
                  pausedForCallRef.current = false
                  timeBeforeCallRef.current = 0
                  wasPlayingBeforeInterruptionRef.current = false
                  setPlaying(true)
                })
                .catch(() => {
                  // Will retry in monitor
                })
            }
          }, 500)
        }
        // Also check for media interruption resume when page becomes visible
        else if (pausedForMediaRef.current && audioRef.current && wasPlayingBeforeInterruptionRef.current && audioRef.current.paused) {
          const resumeTime = Math.max(0, timeBeforeMediaRef.current)
          audioRef.current.currentTime = resumeTime
          seekTo(resumeTime)
          
          setTimeout(() => {
            if (audioRef.current && pausedForMediaRef.current && audioRef.current.paused) {
              audioRef.current.play()
                .then(() => {
                  pausedForMediaRef.current = false
                  timeBeforeMediaRef.current = 0
                  wasPlayingBeforeInterruptionRef.current = false
                  setPlaying(true)
                })
                .catch(() => {
                  // Will retry in monitor
                })
            }
          }, 300)
        }
        setTimeout(iosBackgroundMonitor, 300)
      } else {
        // Page became hidden - might be a phone call starting
        // Don't clear interruption flags here, let handlePause handle it
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(monitorInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPlaying, currentTrack, duration, currentTime, setPlaying, seekTo, updateTime, playNextTrack, updateDuration])

  // Handle audio interruptions - phone calls and other media
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleSuspend = () => {
      // Audio was suspended (e.g., by system or other media)
      if (isPlaying && currentTrack && !isSourceChangingRef.current) {
        const isPageHidden = document.hidden || document.visibilityState === 'hidden'
        
        if (isPageHidden && !pausedForCallRef.current) {
          // Likely a phone call
          timeBeforeCallRef.current = audio.currentTime
          pausedForCallRef.current = true
          wasPlayingBeforeInterruptionRef.current = true
        } else if (!isPageHidden && !pausedForCallRef.current && !pausedForMediaRef.current) {
          // Likely other media interruption
          timeBeforeMediaRef.current = audio.currentTime
          pausedForMediaRef.current = true
          wasPlayingBeforeInterruptionRef.current = true
        }
        shouldAutoResumeRef.current = true
      }
    }

    // Monitor for interruptions when audio is paused externally
    const checkForInterruption = () => {
      if (audio.paused && isPlaying && currentTrack && !isSourceChangingRef.current) {
        const isPageHidden = document.hidden || document.visibilityState === 'hidden'
        
        // If we're paused but should be playing, it's an interruption
        if (isPageHidden && !pausedForCallRef.current) {
          timeBeforeCallRef.current = audio.currentTime
          pausedForCallRef.current = true
          wasPlayingBeforeInterruptionRef.current = true
          shouldAutoResumeRef.current = true
        } else if (!isPageHidden && !pausedForCallRef.current && !pausedForMediaRef.current) {
          timeBeforeMediaRef.current = audio.currentTime
          pausedForMediaRef.current = true
          wasPlayingBeforeInterruptionRef.current = true
          shouldAutoResumeRef.current = true
        }
      }
    }

    // Check periodically for interruptions
    const interruptionCheckInterval = setInterval(checkForInterruption, 500)

    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('suspend', handleSuspend)

    return () => {
      clearInterval(interruptionCheckInterval)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('suspend', handleSuspend)
    }
  }, [isPlaying, currentTrack, handlePause, handlePlay])

  // Monitor for resuming after interruptions (works for all platforms)
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return

    const audio = audioRef.current
    let resumeCheckInterval = null

    const checkForResume = () => {
      // Check for phone call resume
      if (pausedForCallRef.current && wasPlayingBeforeInterruptionRef.current && audio.paused && document.visibilityState === 'visible') {
        const resumeTime = Math.max(0, timeBeforeCallRef.current - 2)
        audio.currentTime = resumeTime
        seekTo(resumeTime)
        
        setTimeout(() => {
          if (audio && pausedForCallRef.current && audio.paused) {
            audio.play()
              .then(() => {
                pausedForCallRef.current = false
                timeBeforeCallRef.current = 0
                wasPlayingBeforeInterruptionRef.current = false
                setPlaying(true)
              })
              .catch(() => {
                // Will retry
              })
          }
        }, 500)
      }
      
      // Check for other media interruption resume
      if (pausedForMediaRef.current && wasPlayingBeforeInterruptionRef.current && audio.paused && document.visibilityState === 'visible') {
        const resumeTime = Math.max(0, timeBeforeMediaRef.current)
        audio.currentTime = resumeTime
        seekTo(resumeTime)
        
        setTimeout(() => {
          if (audio && pausedForMediaRef.current && audio.paused) {
            audio.play()
              .then(() => {
                pausedForMediaRef.current = false
                timeBeforeMediaRef.current = 0
                wasPlayingBeforeInterruptionRef.current = false
                setPlaying(true)
              })
              .catch(() => {
                // Will retry
              })
          }
        }, 300)
      }
    }

    // Check every second for resume opportunities
    resumeCheckInterval = setInterval(checkForResume, 1000)

    // Also check on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(checkForResume, 300)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (resumeCheckInterval) {
        clearInterval(resumeCheckInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentTrack, setPlaying, seekTo])

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
          if (audioRef.current && currentTrack) {
            // Directly play audio and update state - don't rely on isPlaying state
            const audio = audioRef.current
            if (audio.paused) {
              audio.play()
                .then(() => {
                  setPlaying(true)
                  // Update playback state immediately
                  if (mediaSession.setPlaybackState) {
                    mediaSession.playbackState = 'playing'
                  }
                })
                .catch((error) => {
                  console.error('Error playing from media session:', error)
                  setPlaying(false)
                })
            }
          }
        })

        // Set pause handler
        mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            // Directly pause audio and update state
            const audio = audioRef.current
            if (!audio.paused) {
              audio.pause()
              setPlaying(false)
              // Update playback state immediately
              if (mediaSession.setPlaybackState) {
                mediaSession.playbackState = 'paused'
              }
            }
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

        // Set next track handler - CRITICAL for iOS background autoplay
        // Store handler reference so we can call it programmatically
        const nextTrackHandler = () => {
          if (currentTrack) {
            // Mark as user interaction since Media Session API counts as interaction
            hasUserInteractedRef.current = true
            nextTrackPendingRef.current = true
            
            // Immediately play next track
            playNextTrack()
            
            // CRITICAL: Force play immediately and multiple times for iOS
            // iOS requires aggressive retry in background
            const forcePlayNext = (attempt = 0) => {
              const delay = isIOS ? (attempt * 200 + 300) : 100
              
              setTimeout(() => {
                if (!audioRef.current || !isPlaying) return
                
                const audio = audioRef.current
                
                // Try to play if paused
                if (audio.paused) {
                  audio.play()
                    .then(() => {
                      // Success - update metadata and state
                      nextTrackPendingRef.current = false
                      updateMetadata()
                      if (mediaSession.setPlaybackState) {
                        mediaSession.playbackState = 'playing'
                      }
                    })
                    .catch((error) => {
                      // Retry if failed (iOS often needs multiple attempts in background)
                      if (attempt < 5) {
                        forcePlayNext(attempt + 1)
                      } else {
                        console.log('iOS background play failed after max attempts')
                      }
                    })
                } else {
                  // Already playing
                  nextTrackPendingRef.current = false
                  updateMetadata()
                  if (mediaSession.setPlaybackState) {
                    mediaSession.playbackState = 'playing'
                  }
                }
              }, delay)
            }
            
            // Start forcing play
            forcePlayNext()
          }
        }
        
        // Store handler reference for programmatic calls (iOS workaround)
        nextTrackHandlerRef.current = nextTrackHandler
        
        // Register the handler
        mediaSession.setActionHandler('nexttrack', nextTrackHandler)

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

  // Constant scrolling speed in pixels per second
  const SCROLL_SPEED = 15 // pixels per second

  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      // Use requestAnimationFrame and setTimeout to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (titleRef.current) {
            const titleEl = titleRef.current
            const wrapperEl = titleEl.closest('.player__title-wrapper')
            const innerEl = titleEl.closest('.player__title-inner')
            if (wrapperEl && innerEl) {
              const isOverflowing = titleEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollTitle(isOverflowing)
              
              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth
                const distance = totalWidth / 2 // Animation moves -50%
                const duration = distance / SCROLL_SPEED
                setTitleDuration(Math.max(duration, 10)) // Minimum 10 seconds
              }
            }
          }
          if (artistRef.current) {
            const artistEl = artistRef.current
            const wrapperEl = artistEl.closest('.player__artist-wrapper')
            const innerEl = artistEl.closest('.player__artist-inner')
            if (wrapperEl && innerEl) {
              const isOverflowing = artistEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollArtist(isOverflowing)
              
              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth
                const distance = totalWidth / 2 // Animation moves -50%
                const duration = distance / SCROLL_SPEED
                setArtistDuration(Math.max(duration, 10)) // Minimum 10 seconds
              }
            }
          }
          if (albumRef.current) {
            const albumEl = albumRef.current
            const contentEl = albumEl.closest('.player__album-content')
            const innerEl = albumEl.closest('.player__album-inner')
            if (contentEl && innerEl) {
              const isOverflowing = albumEl.scrollWidth > contentEl.offsetWidth + 5
              setShouldScrollAlbum(isOverflowing)
              
              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              if (isOverflowing) {
                const totalWidth = innerEl.scrollWidth
                const distance = totalWidth / 2 // Animation moves -50%
                const duration = distance / SCROLL_SPEED
                setAlbumDuration(Math.max(duration, 10)) // Minimum 10 seconds
              }
            }
          }
          if (fullscreenArtistRef.current && isFullScreen) {
            const artistEl = fullscreenArtistRef.current
            const wrapperEl = artistEl.closest('.player__fullscreen-artist-wrapper')
            const innerEl = artistEl.closest('.player__fullscreen-artist-inner')
            if (wrapperEl && innerEl) {
              const isOverflowing = artistEl.scrollWidth > wrapperEl.offsetWidth + 5
              setShouldScrollFullscreenArtist(isOverflowing)
              
              // Calculate duration based on inner container width (includes duplicate) for consistent speed
              // Animation moves -50% of inner container width, so distance = innerEl.scrollWidth / 2
              // Use setTimeout to recalculate after duplicate is rendered
              if (isOverflowing) {
                setTimeout(() => {
                  if (innerEl) {
                    const totalWidth = innerEl.scrollWidth
                    const distance = totalWidth / 2 // Animation moves -50%
                    const duration = distance / SCROLL_SPEED
                    setFullscreenArtistDuration(Math.max(duration, 10)) // Minimum 10 seconds
                  }
                }, 50)
              }
            }
          }
        }, isFullScreen ? 300 : 200) // Longer delay for fullscreen to ensure DOM is ready
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
  }, [currentTrack, isFullScreen])

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
                <div className="player__fullscreen-artist-wrapper">
                  <div 
                    className={`player__fullscreen-artist-inner ${shouldScrollFullscreenArtist ? 'player__fullscreen-artist--scroll' : ''}`}
                    style={shouldScrollFullscreenArtist ? { '--scroll-duration': `${fullscreenArtistDuration}s` } : {}}
                  >
                    <p ref={fullscreenArtistRef} className="player__fullscreen-artist">{currentTrack.artist || 'Unknown Artist'}</p>
                    {shouldScrollFullscreenArtist && (
                      <p className="player__fullscreen-artist player__fullscreen-artist--duplicate">{currentTrack.artist || 'Unknown Artist'}</p>
                    )}
                  </div>
                </div>
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
                    hasUserInteractedRef.current = true
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
              <div 
                className={`player__title-inner ${shouldScrollTitle ? 'player__text--scroll' : ''}`}
                style={shouldScrollTitle ? { '--scroll-duration': `${titleDuration}s` } : {}}
              >
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
              <div 
                className={`player__artist-inner ${shouldScrollArtist ? 'player__text--scroll' : ''}`}
                style={shouldScrollArtist ? { '--scroll-duration': `${artistDuration}s` } : {}}
              >
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
                  <div 
                    className={`player__album-inner ${shouldScrollAlbum ? 'player__text--scroll' : ''}`}
                    style={shouldScrollAlbum ? { '--scroll-duration': `${albumDuration}s` } : {}}
                  >
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
                hasUserInteractedRef.current = true
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
