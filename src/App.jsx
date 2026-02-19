import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { PlayerProvider } from './context/PlayerContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PromotionalModal from './components/PromotionalModal'
import Home from './pages/Home'
import Admin from './pages/Admin'
import './App.css'

const AppContent = () => {
  const location = useLocation()
  const isAdminPage = location.pathname === '/admin'

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main className={`app__content ${isAdminPage ? 'app__content--admin' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <PromotionalModal />}
    </>
  )
}

const App = () => {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <Router>
          <AppContent />
        </Router>
      </PlayerProvider>
    </ThemeProvider>
  )
}

export default App