import React from 'react'
import { Link } from 'react-router-dom'
import './nav.css'

export default function NavBar() {
  return (
    <nav className="top-nav" aria-label="Course navigation">
      <div className="nav-main">
        <Link className="brand" to="/">Memory Palace</Link>

        <div className="nav-controls">
          <Link className="nav-link" to="/">Home</Link>
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
            href="https://devpost.com"
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
