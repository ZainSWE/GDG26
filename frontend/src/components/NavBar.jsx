import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import course from '../data/courseData'
import './nav.css'

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const selectedUnitId = pathParts[0] === 'unit' ? pathParts[1] : ''
  const selectedConceptId = pathParts[2] === 'concept' ? pathParts[3] : ''
  const selectedUnit = course.units.find((unit) => unit.id === selectedUnitId) || null

  return (
    <nav className="top-nav" aria-label="Course navigation">
      <div className="nav-main">
        <Link className="brand" to="/">{course.name}</Link>

        <div className="nav-controls">
          <label className="nav-control-label">
            Unit
            <select
              className="nav-select"
              value={selectedUnitId}
              onChange={(event) => {
                const value = event.target.value
                if (!value) {
                  navigate('/')
                  return
                }
                navigate(`/unit/${value}`)
              }}
            >
              <option value="">Home</option>
              {course.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="nav-control-label">
            Chapter
            <select
              className="nav-select"
              value={selectedConceptId}
              disabled={!selectedUnit}
              onChange={(event) => {
                const value = event.target.value
                if (!selectedUnit) {
                  return
                }
                if (!value) {
                  navigate(`/unit/${selectedUnit.id}`)
                  return
                }
                navigate(`/unit/${selectedUnit.id}/concept/${value}`)
              }}
            >
              <option value="">Overview</option>
              {(selectedUnit?.concepts || []).map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </nav>
  )
}
