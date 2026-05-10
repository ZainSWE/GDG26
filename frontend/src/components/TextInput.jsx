import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useMagneticGroup } from '../hooks/useMagneticButton'
import './TextInput.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gdg26.onrender.com'

export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [mode, setMode] = useState('text') // 'text' | 'pdf'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const wrapperRef   = useRef(null)
  const titleRef     = useRef(null)

  // GSAP entrance — stagger non-title children up from below
  useEffect(() => {
    if (!wrapperRef.current) return
    const els = Array.from(wrapperRef.current.children).filter(
      el => !el.classList.contains('input-title')
    )
    gsap.fromTo(els,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', clearProps: 'y,opacity' }
    )
  }, [])

  // GSAP title — each letter slides up + fades in, left to right
  useEffect(() => {
    if (!titleRef.current) return
    const letters = titleRef.current.querySelectorAll('span')
    gsap.fromTo(letters,
      { y: 48, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' }
    )
  }, [])

  // Magnetic effect on buttons
  useMagneticGroup(wrapperRef, 'button', 0.36)

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
    <div className="input-wrapper" ref={wrapperRef}>
      <h1 className="input-title" ref={titleRef}>
        {'MindMesh'.split('').map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </h1>
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
              <span className="pdf-icon">⬆</span>
              <span className="pdf-drop-label">Click or drag & drop a PDF here</span>
              <span className="pdf-drop-hint">PDF files only</span>
            </>
          )}
        </div>
      )}

      {error && <p className="input-error">{error}</p>}

      <button
        className={`input-btn${(!canSubmit && !loading) ? ' input-btn--inactive' : ''}`}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Generate Graph'}
      </button>
    </div>
  )
}