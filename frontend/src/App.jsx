import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Lenis from 'lenis'
import './App.css'
import GradientBackground from './components/GradientBackground'
import Navbar from './components/Navbar'
import TextInput from './components/TextInput'
import GraphExplorer from './components/GraphExplorer'
import About from './pages/About'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gdg26.onrender.com'

// Wake up the Render backend immediately on page load
fetch(`${BACKEND_URL}/health`).catch(() => {})

export default function App() {
  const [graphData, setGraphData] = useState(null)

  // Lenis smooth scroll — attaches to the .grad-container scroll element
  useEffect(() => {
    const lenis = new Lenis({
      wrapper: document.querySelector('.grad-container') || window,
      content: document.querySelector('.grad-content') || document.documentElement,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
    })

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return (
    <GradientBackground>
      <Navbar onGoHome={() => setGraphData(null)} />
      <Routes>
        <Route path="/" element={
          graphData
            ? <GraphExplorer jsonData={graphData} />
            : <TextInput onSubmit={setGraphData} />
        } />
        <Route path="/about" element={<About />} />
      </Routes>
    </GradientBackground>
  )
}