import { useEffect, useRef } from 'react'
import './GradientBackground.css'

const BLOBS = [
  { id: 1, x: -100, y: -150 },
  { id: 2, x: 400,  y: -50  },
  { id: 3, x: 900,  y: 50   },
  { id: 4, x: 200,  y: 600  },
  { id: 5, x: 800,  y: 550  },
]

export default function GradientBackground({ children }) {
  const containerRef = useRef(null)
  const glowRef = useRef(null)
  const blobRefs = useRef([])
  const mouse = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const glow = glowRef.current

    const handleMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.current.x = e.clientX - rect.left
      mouse.current.y = e.clientY - rect.top
    }

    const animate = () => {
      const lerp = 0.12
      current.current.x += (mouse.current.x - current.current.x) * lerp
      current.current.y += (mouse.current.y - current.current.y) * lerp

      glow.style.left = current.current.x + 'px'
      glow.style.top  = current.current.y + 'px'

      // Push blobs based on mouse proximity
      blobRefs.current.forEach((blob, i) => {
        if (!blob) return
        const rect = blob.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        const blobCX = rect.left - containerRect.left + rect.width  / 2
        const blobCY = rect.top  - containerRect.top  + rect.height / 2

        const dx = current.current.x - blobCX
        const dy = current.current.y - blobCY
        const dist = Math.sqrt(dx * dx + dy * dy)

        const influence = 400
        const proximity = Math.max(0, 1 - dist / influence)
        const scale = 1 + proximity * 0.45

        blob.style.transform = `scale(${scale})`
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    const show = () => glow.style.opacity = '1'
    const hide = () => glow.style.opacity = '0'

    container.addEventListener('mousemove', handleMove)
    container.addEventListener('mouseenter', show)
    container.addEventListener('mouseleave', hide)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('mouseenter', show)
      container.removeEventListener('mouseleave', hide)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className="grad-container">
      <div className="grad-blobs">
        {BLOBS.map((blob, i) => (
          <div
            key={blob.id}
            ref={el => blobRefs.current[i] = el}
            className={`blob blob-${blob.id}`}
          />
        ))}
      </div>
      <div className="grad-glow" ref={glowRef} />
      <div className="grad-content">
        {children}
      </div>
    </div>
  )
}