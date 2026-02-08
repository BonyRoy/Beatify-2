import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { PlayerProvider } from './context/PlayerContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PromotionalModal from './components/PromotionalModal'
import Home from './pages/Home'
import Admin from './pages/Admin'
import './App.css'

const App = () => {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <Router>
          <Navbar />
          <main className="app__content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Footer />
          <PromotionalModal />
        </Router>
      </PlayerProvider>
    </ThemeProvider>
  )
}

export default App