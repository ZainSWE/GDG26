import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import course from '../data/courseData'
import './concept.css'

export default function ConceptPage() {
  const { unitId, conceptId } = useParams()
  const unit = course.units.find((u) => u.id === unitId)
  if (!unit) return <div className="concept-page">Unit not found</div>
  const concept = unit.concepts.find((c) => c.id === conceptId)
  if (!concept) return <div className="concept-page">Concept not found</div>
  const [isExpanded, setIsExpanded] = useState(false)

  const conceptIndex = unit.concepts.findIndex((item) => item.id === concept.id)
  const prevConcept = conceptIndex > 0 ? unit.concepts[conceptIndex - 1] : null
  const nextConcept =
    conceptIndex < unit.concepts.length - 1 ? unit.concepts[conceptIndex + 1] : null

  const unitIndex = course.units.findIndex((item) => item.id === unit.id)
  const nextUnit = unitIndex < course.units.length - 1 ? course.units[unitIndex + 1] : null

  return (
    <div className="concept-page">
      <h2>{concept.name}</h2>
      <p className="unit-label">{unit.name}</p>

      <div className="concept-card">
        <h4>Summary</h4>
        <p>{concept.summary}</p>
      </div>

      {concept.examples && concept.examples.length > 0 && (
        <div className="concept-card">
          <h4>Examples / Notation</h4>
          <ul className="formula-list">
            {concept.examples.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="concept-actions">
        <button
          type="button"
          className="read-more-link"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      </div>

      {isExpanded && (
        <div className="concept-card more-details">
          <h4>Additional Information</h4>
          <p><strong>Unit context:</strong> {concept.additional.unitContext}</p>
          <p><strong>Importance level:</strong> {concept.importance}/5</p>
          {concept.additional.related.length > 0 && (
            <>
              <h5>Related topics</h5>
              <ul className="formula-list">
                {concept.additional.related.map((related) => (
                  <li key={related.id}>
                    <strong>{related.title}:</strong> {related.content}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="chapter-nav">
        {prevConcept ? (
          <Link to={`/unit/${unit.id}/concept/${prevConcept.id}`} className="nav-pill">
            ← {prevConcept.name}
          </Link>
        ) : (
          <span />
        )}

        <Link to={`/unit/${unit.id}`} className="nav-pill">
          Back to {unit.name}
        </Link>

        {nextConcept ? (
          <Link to={`/unit/${unit.id}/concept/${nextConcept.id}`} className="nav-pill">
            {nextConcept.name} →
          </Link>
        ) : nextUnit ? (
          <Link to={`/unit/${nextUnit.id}`} className="nav-pill">
            Next Unit: {nextUnit.name} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
