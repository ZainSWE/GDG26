import { useRef, useState } from 'react'
import './TextInput.css'

const BACKEND_URL = 'http://localhost:4000'

// ── DEV PLACEHOLDER ───────────────────────────────────────────────────────────
// Bypasses the backend and returns a static graph so you can develop without
// hitting the Gemini rate limit.
//
// TO UNDO WHEN DEPLOYING:
//   1. Delete the PLACEHOLDER_GRAPH constant below.
//   2. Set USE_PLACEHOLDER = false  (or just delete the entire block).
//   3. The handleSubmit function will automatically use the real backend again.
// ─────────────────────────────────────────────────────────────────────────────
const USE_PLACEHOLDER = true
const PLACEHOLDER_GRAPH = {"nodes":[{"id":"1","title":"Dummy English Class","content":"An introductory course to fundamental concepts of the English language.","connected":["2","3"],"importance":5},{"id":"2","title":"Unit 1 - Alphabet","content":"Explores the basic symbolic components of the English writing system.","connected":["1","4","5"],"importance":4},{"id":"3","title":"Unit 2 - Words","content":"Focuses on how letters combine to form meaningful units and phrases.","connected":["1","6","7"],"importance":4},{"id":"4","title":"Alphabet Definition","content":"The complete ordered set of letters used in the English language.","connected":["2","5"],"importance":3},{"id":"5","title":"Letter Definition","content":"A fundamental written symbol representing a specific sound within a language.","connected":["2","4","6"],"importance":2},{"id":"6","title":"Word Definition","content":"A collection of one or more letters arranged to convey a specific meaning.","connected":["3","5","7"],"importance":3},{"id":"7","title":"Sentence Definition","content":"A collection of words organized to express a complete thought or meaning.","connected":["3","6"],"importance":3}]}

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
      // ── DEV PLACEHOLDER: remove this block when deploying (see top of file) ──
      if (USE_PLACEHOLDER) {
        await new Promise((r) => setTimeout(r, 600)) // fake latency
        onSubmit(PLACEHOLDER_GRAPH)
        return
      }
      // ── END PLACEHOLDER ───────────────────────────────────────────────────────
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