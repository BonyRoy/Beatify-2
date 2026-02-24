import React, { useEffect, useRef, useState } from 'react'
import { fetchMusicList } from '../services/musicService'
import './Artists.css'

// Map image names from JSON to actual filenames in public/Artists folder (exported for reuse)
export const getImagePath = (imageName) => {
  const imageMap = {
    arjit: 'arjitsingh.jpeg',
    mohit: 'mohit.webp',
    rahet: 'rahet.png',
    shankar: 'shankar.jpeg',
    richa: 'richa.jpeg',
    javedali: 'javedali.jpeg',
    honey: 'honey.jpg',
    badshah: 'badshah.jpeg',
    JubinNautiyal: 'Jubin Nautiyal.jpeg',
    HimeshReshammiya: 'Himesh Reshammiya.webp',
    Shaan: 'Shaan.jpeg',
    SonuNigam: 'Sonu Nigam.jpg',
    SajidWajid: 'SajidWajid.jpeg',
    ShreyaGhoshal: 'Shreya Ghoshal.jpeg',
    BabulSupriyo: 'BabulSupriyo .jpeg',
    GuruRandhawa: 'Guru Randhawa.webp',
    SukhwinderSingh: 'Sukhwinder Singh.webp',
    Papon: 'Papon.jpg',
    AbhijeetBhattacharya: 'AbhijeetBhattacharya.webp',
    VishalShekhar: 'Vishal-Shekhar .jpeg',
    AtifAslam: 'Atif Aslam.jpg',
    KK: 'KK.jpeg',
    DiljitDosanjh: 'Diljit Dosanjh.jpeg',
    ShafqatAmanatAli: 'ShafqatAmanatAli.jpeg',
    SunidhiChauhan: 'Sunidhi Chauhan.jpeg',
    ARRahman: 'ARRahman.jpg',
    AjayAtul: 'Ajay-Atul.webp',
    AyushmannKhurrana: 'AyushmannKhurrana.jpeg',
    ArmaanMalik: 'ArmaanMalik.webp',
    HarrdySandhu: 'HarrdySandhu.webp',
    VishalMishra: 'VishalMishra.jpeg',
    HarshitSaxena: 'Harshit Saxena .jpeg',
    AlkaYagnik: 'Alka Yagnik.jpg',
    UditNarayan: 'Udit Narayan.jpeg',
    KumarSanu: 'Kumar Sanu.jpeg',
    KailashKher: 'Kailash Kher.jpg',
    KishoreKumar: 'Kishore Kumar.webp',
  }
  
  const filename = imageMap[imageName] || `${imageName}.jpg`
  return `/Artists/${filename}`
}

const Artists = ({ artists, selectedArtist, searchQuery, onArtistClick }) => {
  const containerRef = useRef(null)
  const selectedCardRef = useRef(null)
  const [musicList, setMusicList] = useState([])
  
  // Fetch music list when there's a search query to filter artists by matching tracks
  useEffect(() => {
    if (searchQuery) {
      fetchMusicList()
        .then(tracks => setMusicList(tracks))
        .catch(err => {
          console.error('Error fetching music list for artist filtering:', err)
          setMusicList([])
        })
    } else if (musicList.length > 0) {
      // Only clear if we have data to avoid unnecessary renders
      setMusicList([])
    }
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Filter tracks based on search query
  const filteredTracks = React.useMemo(() => {
    if (!searchQuery || musicList.length === 0) return []
    
    const query = searchQuery.toLowerCase()
    return musicList.filter(track => {
      const trackName = (track.name || '').toLowerCase()
      const trackArtist = (track.artist || '').toLowerCase()
      const trackAlbum = (track.album || '').toLowerCase()
      return trackName.includes(query) || 
             trackArtist.includes(query) || 
             trackAlbum.includes(query)
    })
  }, [musicList, searchQuery])
  
  // Filter and reorder artists
  const reorderedArtists = React.useMemo(() => {
    if (artists.length === 0) return artists
    
    // First, filter by search query if present
    let filteredArtists = artists
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredArtists = artists.filter(artist => {
        const artistName = (artist.name || '').toLowerCase()
        // Check if artist name matches search
        const nameMatches = artistName.includes(query)
        
        // Check if this artist has any matching tracks
        if (filteredTracks.length > 0) {
          const hasMatchingTracks = filteredTracks.some(track => {
            const trackArtist = (track.artist || '').toLowerCase()
            return trackArtist.includes(artistName) || artistName.includes(trackArtist)
          })
          // Only show artist if name matches OR has matching tracks
          return nameMatches || hasMatchingTracks
        }
        
        // If no matching tracks, only show if name matches
        return nameMatches
      })
    } else if (filteredTracks.length > 0) {
      // Even without search query, filter out artists with no tracks if we have filtered tracks
      filteredArtists = artists.filter(artist => {
        const artistName = (artist.name || '').toLowerCase()
        return filteredTracks.some(track => {
          const trackArtist = (track.artist || '').toLowerCase()
          return trackArtist.includes(artistName) || artistName.includes(trackArtist)
        })
      })
    }
    
    // Then reorder based on localStorage (first 4 selected artists)
    const savedArtists = JSON.parse(localStorage.getItem('selectedArtists') || '[]')
    
    if (savedArtists.length > 0) {
      // Find artists that match saved names (first 4)
      const prioritizedArtists = []
      const remainingArtists = []
      
      filteredArtists.forEach(artist => {
        const index = savedArtists.indexOf(artist.name)
        if (index !== -1) {
          prioritizedArtists[index] = artist
        } else {
          remainingArtists.push(artist)
        }
      })
      
      // Filter out undefined entries and combine
      return prioritizedArtists.filter(Boolean).concat(remainingArtists)
    }
    
    return filteredArtists
  }, [artists, searchQuery, filteredTracks])

  // Scroll to start on initial load if we have reordered artists
  useEffect(() => {
    const savedArtists = JSON.parse(localStorage.getItem('selectedArtists') || '[]')
    if (savedArtists.length > 0 && containerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            left: 0,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [])

  // Auto-scroll back to selected artist after 10s of inactivity
  useEffect(() => {
    if (!selectedArtist || !containerRef.current || !selectedCardRef.current) return

    const scrollContainer = containerRef.current
    const selectedCard = selectedCardRef.current
    let inactivityTimer = null

    const scrollToSelectedArtist = () => {
      const rect = selectedCard.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      const isVisible =
        rect.left >= containerRect.left && rect.right <= containerRect.right
      if (!isVisible) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        scrollToSelectedArtist()
      }, 10000)
    }

    const handleScroll = () => resetTimer()
    const handleUserActivity = () => resetTimer()

    resetTimer()
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)
    window.addEventListener('touchstart', handleUserActivity)

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      scrollContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
    }
  }, [selectedArtist])

  // Don't render if no artists match and update body class
  useEffect(() => {
    if (reorderedArtists.length === 0) {
      document.body.classList.add('artists-hidden')
    } else {
      document.body.classList.remove('artists-hidden')
    }
    return () => {
      document.body.classList.remove('artists-hidden')
    }
  }, [reorderedArtists.length])

  // Don't render if no artists match
  if (reorderedArtists.length === 0) {
    return null
  }

  return (
    <div className="artists-section">
      <div className="artists-container" ref={containerRef}>
        {reorderedArtists.map((artist) => {
          const isSelected = selectedArtist === artist.name
          const shouldGrayOut = selectedArtist && !isSelected
          return (
            <div 
              key={artist.id} 
              ref={isSelected ? selectedCardRef : null}
              className={`artist-card ${shouldGrayOut ? 'artist-card--grayed' : ''}`}
              onClick={() => onArtistClick && onArtistClick(artist.name)}
            >
              <div className={`artist-image-wrapper ${isSelected ? 'artist-image-wrapper--selected' : ''}`}>
                <img
                  src={getImagePath(artist.image)}
                  alt={artist.name}
                  className={`artist-image ${shouldGrayOut ? 'artist-image--grayed' : ''}`}
                  onError={(e) => {
                    // Fallback to a placeholder if image fails to load
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<div class="artist-placeholder">' + artist.name.charAt(0) + '</div>'
                  }}
                />
              </div>
              <p className="artist-name">{artist.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Artists
