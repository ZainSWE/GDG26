import { useState, useRef } from 'react'
import './Upload.css'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f)
    } else {
      alert('Please upload a PDF file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('pdf', file)

    const res = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      alert('Uploaded successfully!')
    } else {
      alert('Upload failed')
    }
  }

  return (
    <div className="upload-wrapper">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <span className="upload-icon">📄</span>
            <p className="upload-filename">{file.name}</p>
            <p className="upload-sub">Click to change file</p>
          </>
        ) : (
          <>
            <span className="upload-icon">⬆️</span>
            <p className="upload-label">Drop your PDF here</p>
            <p className="upload-sub">or click to browse</p>
          </>
        )}
      </div>

      {file && (
        <button className="upload-btn" onClick={handleUpload}>
          Upload PDF
        </button>
      )}
    </div>
  )
}