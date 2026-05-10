import { useEffect, useMemo, useRef, useState } from 'react'
import {
  courseSourceOptions,
  getDefaultCourseSource,
  loadCourseDataFromSource,
  normalizeCourseData,
} from '../data/courseData'
import './GraphExplorer.css'

function toPoint(percentX, percentY) {
  return { x: percentX, y: percentY }
}

function getUnitLayout(index) {
  const positions = [
    toPoint(26, 24),
    toPoint(74, 24),
    toPoint(26, 74),
    toPoint(74, 74),
  ]

  return positions[index] || toPoint(50, 18 + index * 14)
}

function getConceptLayout(count, centerX, centerY, radius = 16) {

  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    return toPoint(x, y)
  })
}

function getCenteredPoint() {
  return toPoint(50, 50)
}

function shouldHideNode(type, zoomLevel, isActive) {
  if (zoomLevel === 0) {
    return type === 'concept'
  }

  if (zoomLevel === 1) {
    if (type === 'root') {
      return true
    }

    if (type === 'unit') {
      return !isActive
    }

    return false
  }

  return type !== 'concept' || !isActive
}

function GraphNode({ id, title, active, emphasis, style, type, onPointerEnter, onPointerDown, onTouchStart, hidden }) {
  return (
    <div
      className={`graph-node graph-node--${type} ${active ? 'is-active' : ''} ${
        emphasis ? 'is-emphasis' : ''
      } ${hidden ? 'is-hidden' : ''}`}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      data-type={type}
      data-id={id}
      aria-hidden={hidden}
    >
      <span>{title}</span>
    </div>
  )
}

export default function GraphExplorer({ jsonData = null }) {
  const [zoomLevel, setZoomLevel] = useState(0)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [activeUnitId, setActiveUnitId] = useState('')
  const [activeConceptId, setActiveConceptId] = useState('')
  const [courseData, setCourseData] = useState({ id: 'course', name: 'Course', units: [] })
  const [sourcePath, setSourcePath] = useState(getDefaultCourseSource())
  const [loadingSource, setLoadingSource] = useState(false)
  const [sourceError, setSourceError] = useState('')
  const stageRef = useRef(null)

  const activeUnit = courseData.units.find((unit) => unit.id === activeUnitId) || courseData.units[0]
  const activeConcept = activeUnit?.concepts.find((concept) => concept.id === activeConceptId) || null

  useEffect(() => {
    if (!activeUnit && courseData.units[0]) {
      setActiveUnitId(courseData.units[0].id)
    }
  }, [activeUnit])

  useEffect(() => {
    // when courseData changes, reset actives to the new data
    if (courseData && courseData.units && courseData.units.length) {
      setActiveUnitId(courseData.units[0].id)
      setActiveConceptId('')
    }
  }, [courseData])

  // When a graph is passed in from the backend, use it directly
  useEffect(() => {
    if (jsonData) {
      setCourseData(normalizeCourseData(jsonData))
      setZoomLevel(0)
    }
  }, [jsonData])

  useEffect(() => {
    let cancelled = false

    async function loadSource() {
      if (!sourcePath) {
        return
      }

      setLoadingSource(true)
      setSourceError('')

      try {
        const nextCourse = await loadCourseDataFromSource(sourcePath)
        if (!cancelled) {
          setCourseData(nextCourse)
        }
      } catch (error) {
        if (!cancelled) {
          setSourceError(error instanceof Error ? error.message : 'Failed to load JSON source')
        }
      } finally {
        if (!cancelled) {
          setLoadingSource(false)
        }
      }
    }

    loadSource()

    return () => {
      cancelled = true
    }
  }, [sourcePath])

  const unitLayouts = useMemo(
    () => (courseData.units || []).map((unit, index) => ({ unit, ...getUnitLayout(index) })),
    [courseData.units],
  )

  const conceptLayouts = useMemo(
    () => {
      const focusUnitLayout = getCenteredPoint()
      // Increase radius when zoomed into a unit so concepts spread out more
      // Use a larger radius so concept nodes are clearly visible around the focused unit
      const radius = zoomLevel >= 1 ? 40 : 16

      return getConceptLayout(activeUnit?.concepts.length || 0, focusUnitLayout.x, focusUnitLayout.y, radius)
    },
    [activeUnit?.concepts.length, zoomLevel],
  )

  const unitConnections = useMemo(
    () => {
      const root = { x: 50, y: 50 }

      return [
        { from: root, to: unitLayouts[0] },
        { from: root, to: unitLayouts[1] },
        { from: root, to: unitLayouts[2] },
        { from: root, to: unitLayouts[3] },
        { from: unitLayouts[0], to: unitLayouts[1] },
        { from: unitLayouts[2], to: unitLayouts[3] },
        { from: unitLayouts[0], to: unitLayouts[2] },
        { from: unitLayouts[1], to: unitLayouts[3] },
      ].filter((line) => line.from && line.to)
    },
    [unitLayouts],
  )

  const conceptConnections = useMemo(() => {
    if (!activeUnit || !activeUnit.concepts.length) {
      return []
    }

    const focusedUnitLayout = unitLayouts.find((entry) => entry.unit.id === activeUnit.id) || {
      x: 50,
      y: 50,
    }
    return activeUnit.concepts.map((_, index) => ({ from: focusedUnitLayout, to: conceptLayouts[index] }))
  }, [activeUnit, conceptLayouts, unitLayouts])

  const visibleConcepts = zoomLevel >= 1 ? activeUnit?.concepts || [] : []

  const handleWheel = (event) => {
    // Ensure we have a hovered node; for trackpad pinch gestures the pointer hover may not be set,
    // so fall back to the element located at the event coordinates.
    if (!hoveredNode) {
      try {
        const el = document.elementFromPoint(event.clientX, event.clientY)
        const node = el && el.closest && el.closest('.graph-node')

        if (node && node.dataset && node.dataset.type) {
          setHoveredNode({ type: node.dataset.type, id: node.dataset.id })
        } else {
          return
        }
      } catch (err) {
        return
      }
    }

    event.preventDefault()

    const zoomingIn = event.deltaY < 0

    if (zoomingIn) {
      if (zoomLevel === 0 && hoveredNode.type === 'unit') {
        setActiveUnitId(hoveredNode.id)
        setActiveConceptId('')
        setZoomLevel(1)
        return
      }

      if (zoomLevel === 1 && hoveredNode.type === 'concept') {
        setActiveConceptId(hoveredNode.id)
        setZoomLevel(2)
      }
      return
    }

    if (zoomLevel === 2) {
      setZoomLevel(1)
      setActiveConceptId('')
      return
    }

    if (zoomLevel === 1) {
      setZoomLevel(0)
      setActiveConceptId('')
      return
    }
  }

  useEffect(() => {
    const stageElement = stageRef.current

    if (!stageElement) {
      return undefined
    }

    const onWheel = (event) => {
      handleWheel(event)
    }

    stageElement.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      stageElement.removeEventListener('wheel', onWheel)
    }
  }, [hoveredNode, zoomLevel])

  return (
    <div className="explorer-shell">
      <aside className="side-nav">
        <div className="side-nav__header">
          <div className="side-nav__eyebrow">CIS 2910</div>
          <h1>{courseData.name}</h1>
          <p>One connected graph for units and concepts.</p>
        </div>

        <div className="source-switcher">
          <label htmlFor="course-source">Test JSON</label>
          <select
            id="course-source"
            value={sourcePath}
            onChange={(event) => setSourcePath(event.target.value)}
          >
            {courseSourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {loadingSource && <div className="source-switcher__status">Loading JSON...</div>}
          {sourceError && <div className="source-switcher__status source-switcher__status--error">{sourceError}</div>}
        </div>

        <div className={`nav-item nav-item--root ${zoomLevel === 0 ? 'is-active' : ''}`}>
          Course Overview
        </div>

        <div className="nav-group">
          {courseData.units.map((unit) => {
            const isSelected = unit.id === activeUnitId
            return (
              <div key={unit.id} className="nav-group__block">
                <div className={`nav-item ${isSelected ? 'is-active' : ''}`}>
                  {unit.name}
                </div>

                {isSelected && (
                  <div className="nav-subgroup">
                    {unit.concepts.map((concept) => (
                      <div
                        key={concept.id}
                        className={`nav-subitem ${activeConceptId === concept.id ? 'is-active' : ''}`}
                      >
                        {concept.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <main className="graph-workspace">
        <section className={`graph-panel ${activeConcept ? 'is-detail-open' : ''}`}>
          <div
            ref={stageRef}
            className={`graph-stage ${zoomLevel === 2 ? 'is-zoomed' : zoomLevel === 1 ? 'is-unit-focus' : ''} ${activeConceptId ? 'is-concept-focus' : ''}`}
          >
            <svg className="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {zoomLevel === 0 &&
                unitConnections.map((line, index) => (
                  <line
                    key={`unit-line-${index}`}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    className="graph-line"
                  />
                ))}

              {zoomLevel === 2 && activeConceptId &&
                conceptConnections.map((line, index) => (
                  <line
                    key={`concept-line-${index}`}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    className="graph-line graph-line--concept"
                  />
                ))}
            </svg>

            <GraphNode
              title={courseData.name}
              id={courseData.id}
              type="root"
              active={zoomLevel === 0}
              emphasis
              hidden={shouldHideNode('root', zoomLevel, true)}
              onPointerEnter={() => setHoveredNode({ type: 'root', id: courseData.id })}
              onPointerDown={() => setHoveredNode({ type: 'root', id: courseData.id })}
              onTouchStart={() => setHoveredNode({ type: 'root', id: courseData.id })}
              style={{ left: '50%', top: '50%' }}
            />

            {unitLayouts.map(({ unit, x, y }, index) => (
              <GraphNode
                key={unit.id}
                id={unit.id}
                title={unit.name}
                type="unit"
                active={unit.id === activeUnitId && zoomLevel >= 1}
                emphasis={unit.id === activeUnitId}
                hidden={shouldHideNode('unit', zoomLevel, unit.id === activeUnitId)}
                onPointerEnter={() => setHoveredNode({ type: 'unit', id: unit.id })}
                onPointerDown={() => setHoveredNode({ type: 'unit', id: unit.id })}
                onTouchStart={() => setHoveredNode({ type: 'unit', id: unit.id })}
                style={{
                  left: `${unit.id === activeUnitId && zoomLevel >= 1 && !activeConceptId ? 50 : x}%`,
                  top: `${unit.id === activeUnitId && zoomLevel >= 1 && !activeConceptId ? 50 : y}%`,
                  '--delay': `${index * 80}ms`,
                }}
              />
            ))}

            {visibleConcepts.map((concept, index) => {
              const position = conceptLayouts[index] || { x: 50, y: 50 }
              // consider a concept focused if it's the active concept (center it whenever selected)
              const isFocusedConcept = concept.id === activeConceptId

              return (
                <GraphNode
                  key={concept.id}
                  id={concept.id}
                  title={concept.name}
                  type="concept"
                  active={isFocusedConcept}
                  emphasis={activeUnitId === activeUnit.id}
                  hidden={shouldHideNode('concept', zoomLevel, isFocusedConcept)}
                  onPointerEnter={() => setHoveredNode({ type: 'concept', id: concept.id })}
                  onPointerDown={() => setHoveredNode({ type: 'concept', id: concept.id })}
                  onTouchStart={() => setHoveredNode({ type: 'concept', id: concept.id })}
                  style={{
                    left: `${isFocusedConcept ? 50 : position.x}%`,
                    top: `${isFocusedConcept ? 50 : position.y}%`,
                    '--delay': `${index * 70}ms`,
                  }}
                />
              )
            })}
          </div>
        </section>

        <aside className="detail-panel">
          {activeConcept ? (
            <div className="detail-card">
              <div className="detail-card__eyebrow">Concept Zoom</div>
              <h2>{activeConcept.name}</h2>
              <p className="detail-card__unit">{activeUnit?.name}</p>

              <div className="detail-section">
                <h3>Summary</h3>
                <p>{activeConcept.summary}</p>
              </div>

              <div className="detail-section">
                <h3>Examples / Formulas</h3>
                <ul>
                  {(activeConcept.examples?.length ? activeConcept.examples : [activeConcept.summary]).map(
                    (example, index) => (
                      <li key={`${example}-${index}`}>{example}</li>
                    ),
                  )}
                </ul>
              </div>

              <div className="detail-section">
                <h3>More</h3>
                <p>{activeConcept.additional.unitContext}</p>
                <p className="detail-card__meta">Importance {activeConcept.importance}/5</p>
              </div>

              {activeConcept.additional.related.length > 0 && (
                <div className="detail-section">
                  <h3>Connected topics</h3>
                  <ul>
                    {activeConcept.additional.related.map((related) => (
                      <li key={related.id}>{related.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="detail-card detail-card--empty">
              <div className="detail-card__prompt">Small steps build strong understanding</div>
              <p>
                Zoom over a unit node to reveal its concepts. Zoom further into a concept node to
                bring its summary and formulas into view here.
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
