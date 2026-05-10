import { useState } from 'react'
import graphData from '../../testing/MATH2130_graph.json'
import './TextInput.css'

export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    onSubmit(graphData)
  }

  return (
    <div className="input-wrapper">
      <h1 className="input-title">Memory Palace</h1>
      <p className="input-sub">Paste your notes below to generate a knowledge graph</p>
      <textarea
        className="input-box"
        placeholder="Paste your text here..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
      />
      <button className="input-btn" onClick={handleSubmit}>
        Generate Graph
      </button>
    </div>
  )
}