import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useMagneticGroup } from '../hooks/useMagneticButton'
import './nav.css'

export default function NavBar({ onGoHome }) {
  const navRef      = useRef(null)
  const controlsRef = useRef(null)

  useEffect(() => {
    if (!navRef.current) return
    gsap.fromTo(navRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out', clearProps: 'y,opacity' }
    )
  }, [])

  // Magnetic effect on every nav link + toggle
  useMagneticGroup(controlsRef, 'a, button', 0.34)

  return (
    <nav className="top-nav" ref={navRef} aria-label="Course navigation">
      <div className="nav-main">
        <Link className="brand" to="/" onClick={onGoHome}>Mind Mesh</Link>

        <div className="nav-controls" ref={controlsRef}>
          <Link className="nav-link" to="/" onClick={onGoHome}>Home</Link>
          <Link className="nav-link" to="/about">About</Link>
          <a
            className="nav-link"
            href="https://github.com/ZainSWE/GDG26"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            className="nav-link"
            href="https://devpost.com/software/mindmesh-mks1g6"
            target="_blank"
            rel="noreferrer"
          >
            Devpost
          </a>


        </div>
      </div>
    </nav>
  )
}
