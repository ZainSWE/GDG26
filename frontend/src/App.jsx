import { useState } from 'react'
import './App.css'
import GradientBackground from './components/GradientBackground'
import Navbar from './components/Navbar'
import TextInput from './components/TextInput'
import GraphExplorer from './components/GraphExplorer'

export default function App() {
  const [graphData, setGraphData] = useState(null)

  return (
    <GradientBackground>
      <Navbar />
      {graphData
        ? <GraphExplorer jsonData={graphData} />
        : <TextInput onSubmit={setGraphData} />
      }
    </GradientBackground>
  )
}