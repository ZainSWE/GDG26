import { useState } from 'react'
import './TextInput.css'

const BACKEND_URL = 'http://localhost:4000'

export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Backend error')
      onSubmit(json.data.graph)
    } catch (err) {
      setError(err.message || 'Failed to reach backend')
    } finally {
      setLoading(false)
    }
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
      {error && <p style={{ color: '#ff6b6b', fontSize: '14px', margin: 0 }}>{error}</p>}
      <button className="input-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Generating…' : 'Generate Graph'}
      </button>
    </div>
  )
}