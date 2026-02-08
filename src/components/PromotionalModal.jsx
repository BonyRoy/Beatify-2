import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './PromotionalModal.css'

const PROMOTIONAL_CAMPAIGNS = [
  {
    id: 'bharat-republic-day',
    startDate: '01-01',
    endDate: '01-26',
    backgroundImage: '/playlistbg/bharat.png',
    playlistName: 'Bharat',
    title: 'Feel the Spirit of Patriotism! 🇮🇳',
    buttonText: 'Explore the new "Bharat" Playlist',
    autoCloseDuration: 10000, // milliseconds (10 seconds)
  },
  {
    id: 'independence-day',
    startDate: '08-10',
    endDate: '08-15',
    backgroundImage: '/playlistbg/bharat.png',
    playlistName: 'Bharat',
    title: 'Celebrate Independence Day! 🎉',
    buttonText: 'Explore the "Bharat" Playlist',
    autoCloseDuration: 10000,
  },
  {
    id: 'holi',
    startDate: '03-01',
    endDate: '03-03',
    backgroundImage: '/playlistbg/holi.png',
    playlistName: 'Holi',
    title: 'Celebrate the Festival of Colors! 🎨',
    buttonText: 'Explore the "Holi" Playlist',
    autoCloseDuration: 10000,
  },
  {
    id: 'valentine',
    startDate: '02-07',
    endDate: '02-14',
    backgroundImage: '/playlistbg/valentine.png',
    playlistName: 'Valentine',
    title: 'Celebrate Love! ❤️',
    buttonText: '💕 Explore Valentine Playlist',
    autoCloseDuration: 10000,
  },
]

// Helper function to check if current date falls within campaign date range (ignoring year)
const isCampaignActive = (startDate, endDate) => {
  // Validate inputs
  if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
    return false
  }

  const today = new Date()
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0')
  const currentDay = String(today.getDate()).padStart(2, '0')

  // Parse dates (format: MM-DD)
  const [startMonth, startDay] = startDate.split('-').map(Number)
  const [endMonth, endDay] = endDate.split('-').map(Number)

  // Validate parsed dates
  if (isNaN(startMonth) || isNaN(startDay) || isNaN(endMonth) || isNaN(endDay)) {
    return false
  }

  // Convert to comparable numbers (month * 100 + day)
  const current = parseInt(currentMonth) * 100 + parseInt(currentDay)
  const start = startMonth * 100 + startDay
  const end = endMonth * 100 + endDay

  // Handle year wrap-around (e.g., Dec 20 - Jan 10)
  if (start > end) {
    // Campaign spans across year boundary
    return current >= start || current <= end
  } else {
    // Normal case: campaign within same year
    return current >= start && current <= end
  }
}

const PromotionalModal = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      setProgress(0)
    }, 300) // Match CSS transition duration
  }, [])

  // Find active campaign
  useEffect(() => {
    // Find the first active campaign (show on every reload)
    const campaign = PROMOTIONAL_CAMPAIGNS.find(c => 
      isCampaignActive(c.startDate, c.endDate)
    )

    if (campaign) {
      setActiveCampaign(campaign)
      setIsVisible(true)
      setProgress(0)

      // Animate progress bar
      const startTime = Date.now()
      const duration = campaign.autoCloseDuration
      const interval = 16 // ~60fps

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min((elapsed / duration) * 100, 100)
        setProgress(newProgress)

        if (newProgress >= 100) {
          clearInterval(progressInterval)
        }
      }, interval)

      // Auto-close after specified duration
      const autoCloseTimer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => {
        clearTimeout(autoCloseTimer)
        clearInterval(progressInterval)
      }
    }
  }, [handleClose])

  const handleExploreClick = () => {
    if (activeCampaign) {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('playlist', activeCampaign.playlistName)
      newSearchParams.delete('artist')
      newSearchParams.delete('favorites')
      navigate(`/?${newSearchParams.toString()}`)
      handleClose()
    }
  }

  if (!isVisible || !activeCampaign) {
    return null
  }

  return (
    <div className={`promo-modal__overlay ${isClosing ? 'promo-modal__overlay--closing' : ''}`} onClick={handleClose}>
      <div 
        className={`promo-modal ${isClosing ? 'promo-modal--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="promo-modal__close"
          onClick={handleClose}
          aria-label="Close modal"
        >
          ×
        </button>
        
        <div 
          className="promo-modal__content"
          style={{
            backgroundImage: `url(${activeCampaign.backgroundImage})`,
          }}
        >
          <div className="promo-modal__overlay-dark"></div>
          <h2 className="promo-modal__title">{activeCampaign.title}</h2>
          <button 
            className="promo-modal__button"
            onClick={handleExploreClick}
          >
            {activeCampaign.buttonText}
          </button>
        </div>
        
        <div className="promo-modal__progress-container">
          <div 
            className="promo-modal__progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default PromotionalModal
