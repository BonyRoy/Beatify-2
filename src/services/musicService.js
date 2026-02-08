import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Fetch all music tracks from Firestore
 * Matches the reference implementation from Beatify repo
 * @returns {Promise<Array>} Array of music track objects
 */
export const fetchMusicList = async () => {
  try {
    const q = query(collection(db, 'music'), orderBy('uploadedAt', 'desc'))
    const querySnapshot = await getDocs(q)
    const tracks = []

    querySnapshot.forEach(doc => {
      tracks.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return tracks
  } catch (error) {
    console.error('Error fetching music:', error)
    throw error
  }
}

/**
 * Format duration from seconds to MM:SS format
 * @param {number|string} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00'

  const totalSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
