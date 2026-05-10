import React from 'react'
import { Link } from 'react-router-dom'
import course from '../data/courseData'
import './NodeGraph.css'

function UnitNode({ unit, index, total }) {
  const angle = (index / total) * Math.PI * 2
  const distance = 190
  const x = Math.cos(angle) * distance
  const y = Math.sin(angle) * distance

  return (
    <Link
      to={`/unit/${unit.id}`}
      className="unit-node node-circle"
      style={{ '--x': `${x}px`, '--y': `${y}px` }}
    >
      {unit.name}
    </Link>
  )
}

export default function NodeGraph() {
  const units = course.units
  return (
    <div className="graph-wrap">
      <div className="graph-container">
        <div className="center-node node-circle">{course.name}</div>
        {units.map((u, i) => (
          <UnitNode key={u.id} unit={u} index={i} total={units.length} />
        ))}
      </div>
    </div>
  )
}
