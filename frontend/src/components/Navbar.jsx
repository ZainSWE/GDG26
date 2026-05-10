// src/components/Navbar.jsx
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <h1 className="logo">MindMap</h1>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="https://github.com/ZainSWE/GDG26" target="_blank">GitHub</a></li>
        <li><a href="#">DevPost</a></li>
      </ul>
    </nav>
  )
}