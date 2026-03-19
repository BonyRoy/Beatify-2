import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { ThemeProvider } from './context/ThemeContext'
import { PlaylistProvider } from './context/PlaylistContext'
import { PlayerProvider } from './context/PlayerContext'
import { AlbumArtProvider } from './context/AlbumArtContext'
import { ListeningHistoryProvider } from './context/ListeningHistoryContext'
import { TrackPlayCountsProvider } from './context/TrackPlayCountsContext'
import { CreateAccountProvider } from './context/CreateAccountContext'
import { RequestSongProvider } from './context/RequestSongContext'
import { FeedbackProvider } from './context/FeedbackContext'
import { NotificationsProvider } from './context/NotificationsContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PromotionalModal from './components/PromotionalModal'
import FloatingButton from './components/FloatingButton'
import BeatifyLoadingScreen from './components/BeatifyLoadingScreen'
import ListeningHistoryTracker from './components/ListeningHistoryTracker'
import ListeningStatsSync from './components/ListeningStatsSync'
import Home from './pages/Home'
import Admin from './pages/Admin'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

const AppContent = () => {
  const location = useLocation()
  const isAdminPage = location.pathname === '/admin'

  return (
    <>
      <ToastContainer position="bottom-right" theme="dark" />
      {!isAdminPage && <Navbar />}
        <main className={`app__content ${isAdminPage ? 'app__content--admin' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        {!isAdminPage && <Footer />}
        {!isAdminPage && <FloatingButton onClick={() => {}} ariaLabel="Quick action" />}
        {!isAdminPage && <PromotionalModal />}
    </>
  )
}

const App = () => {
  return (
    <ThemeProvider>
      <BeatifyLoadingScreen />
      <CreateAccountProvider>
        <NotificationsProvider>
        <RequestSongProvider>
        <FeedbackProvider>
        <ListeningHistoryProvider>
          <PlaylistProvider>
          <TrackPlayCountsProvider>
          <PlayerProvider>
            <AlbumArtProvider>
              <ListeningHistoryTracker />
              <ListeningStatsSync />
              <Router>
                <AppContent />
              </Router>
            </AlbumArtProvider>
          </PlayerProvider>
          </TrackPlayCountsProvider>
          </PlaylistProvider>
        </ListeningHistoryProvider>
        </FeedbackProvider>
        </RequestSongProvider>
        </NotificationsProvider>
      </CreateAccountProvider>
    </ThemeProvider>
  )
}

export default App