import { useRef, useState } from 'react'
import './TextInput.css'

const BACKEND_URL = 'http://localhost:4000'

export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [mode, setMode] = useState('text') // 'text' | 'pdf'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handlePdfSelect = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    setError('')
    setPdfFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handlePdfSelect(file)
  }

  const handleSubmit = async () => {
    if (mode === 'text' && !text.trim()) return
    if (mode === 'pdf' && !pdfFile) return
    setLoading(true)
    setError('')
    try {
      let res
      if (mode === 'pdf') {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        res = await fetch(`${BACKEND_URL}/generate-pdf`, {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch(`${BACKEND_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: text }),
        })
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Backend error')
      onSubmit(json.data.graph)
    } catch (err) {
      setError(err.message || 'Failed to reach backend')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = mode === 'text' ? text.trim().length > 0 : pdfFile !== null

  return (
    <div className="input-wrapper">
      <h1 className="input-title">Memory Palace</h1>
      <p className="input-sub">Paste your notes or upload a PDF to generate a knowledge graph</p>

      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${mode === 'text' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('text'); setError('') }}
        >
          Text
        </button>
        <button
          className={`mode-btn ${mode === 'pdf' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('pdf'); setError('') }}
        >
          PDF
        </button>
      </div>

      {mode === 'text' ? (
        <textarea
          className="input-box"
          placeholder="Paste your text here..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
        />
      ) : (
        <div
          className={`pdf-drop-zone ${dragging ? 'pdf-drop-zone--dragging' : ''} ${pdfFile ? 'pdf-drop-zone--filled' : ''}`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => handlePdfSelect(e.target.files[0])}
          />
          {pdfFile ? (
            <>
              <span className="pdf-icon">📄</span>
              <span className="pdf-filename">{pdfFile.name}</span>
              <button
                className="pdf-clear-btn"
                onClick={(e) => { e.stopPropagation(); setPdfFile(null) }}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <span className="pdf-icon">⬆️</span>
              <span className="pdf-drop-label">Click or drag & drop a PDF here</span>
              <span className="pdf-drop-hint">PDF files only</span>
            </>
          )}
        </div>
      )}

      {error && <p className="input-error">{error}</p>}

      <button className="input-btn" onClick={handleSubmit} disabled={loading || !canSubmit}>
        {loading ? 'Generating…' : 'Generate Graph'}
      </button>
    </div>
  )
}