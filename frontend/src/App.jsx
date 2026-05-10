import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import GradientBackground from './components/GradientBackground'
import Navbar from './components/Navbar'
import TextInput from './components/TextInput'
import GraphExplorer from './components/GraphExplorer'
import About from './pages/About'

export default function App() {
  const [graphData, setGraphData] = useState(null)

  return (
    <GradientBackground>
      <Navbar />
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