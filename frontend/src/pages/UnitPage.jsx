import React from 'react'
import { useParams, Link } from 'react-router-dom'
import course from '../data/courseData'
import './unit.css'

export default function UnitPage() {
  const { unitId } = useParams()
  const unit = course.units.find((u) => u.id === unitId)
  if (!unit) return <div style={{ padding: 20 }}>Unit not found</div>

  const total = unit.concepts.length

  return (
    <div className="unit-page">
      <h2>{unit.name}</h2>
      <p className="unit-summary">{unit.summary}</p>
      <div className="concept-graph">
        <div className="center node-circle">{unit.name}</div>
        {unit.concepts.map((c, i) => {
          const angle = (i / total) * Math.PI * 2
          const distance = 190
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance
          return (
            <Link
              key={c.id}
              to={`/unit/${unit.id}/concept/${c.id}`}
              className="concept-node node-circle"
              style={{ '--x': `${x}px`, '--y': `${y}px` }}
            >
              {c.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
