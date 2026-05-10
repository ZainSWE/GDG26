import { Link } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <h1 className="logo">MindMap</h1>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><a href="https://github.com/ZainSWE/GDG26" target="_blank">GitHub</a></li>
        <li><Link to="#">DevPost</Link></li>
      </ul>
    </nav>
  )
}