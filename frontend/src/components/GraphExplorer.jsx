import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeCourseData } from '../data/courseData'
import './GraphExplorer.css'

const UNIT_COLORS = ['#a78bfa', '#22d3ee', '#fb923c', '#4ade80']

// ── Magnetic pull constants ──────────────────────────────────────────────────
const MAGNET_RADIUS = 15   // SVG units — attraction field radius
const MAGNET_STRENGTH = 3.2 // max displacement in SVG units
const DECAY_FACTOR = 0.78   // per-frame decay when mouse leaves (0–1)

function magnetOffset(nodeCx, nodeCy, mouseX, mouseY) {
  const dx = mouseX - nodeCx
  const dy = mouseY - nodeCy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > MAGNET_RADIUS || dist < 0.001) return { dx: 0, dy: 0 }
  const t = 1 - dist / MAGNET_RADIUS
  const force = t * t * MAGNET_STRENGTH // quadratic falloff — soft at edges, strong up close
  return { dx: (dx / dist) * force, dy: (dy / dist) * force }
}

function toPoint(percentX, percentY) {
  return { x: percentX, y: percentY }
}

function getUnitLayout(index) {
  const positions = [
    toPoint(26, 26),
    toPoint(74, 26),
    toPoint(26, 74),
    toPoint(74, 74),
  ]
  return positions[index] || toPoint(50, 18 + index * 14)
}

function getConceptLayout(count, centerX, centerY, radius = 28) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2
    return toPoint(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
  })
}

// ─── Single SVG node ─────────────────────────────────────────────────────────
//  Stripped back: aura + core dot + label. No ring, no chrome.

function SvgNode({ cx, cy, r, label, color, isHovered, isActive, isDimmed, type }) {
  const dim = isDimmed ? 0.10 : 1
  const lit = isHovered || isActive
  const fontSize = type === 'root' ? 2.3 : type === 'unit' ? 2.0 : 1.8

  return (
    <g>
      {/* Soft diffuse glow — only when lit */}
      <circle
        cx={cx} cy={cy}
        r={lit ? r * 3.6 : r * 2.0}
        fill={color}
        opacity={lit ? 0.09 * dim : 0.025 * dim}
        style={{ transition: 'r 300ms ease, opacity 300ms ease' }}
      />
      {/* Core dot */}
      <circle
        cx={cx} cy={cy}
        r={lit ? r * 1.28 : r}
        fill={color}
        opacity={lit ? dim : 0.42 * dim}
        style={{ transition: 'r 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease' }}
      />
      {/* Label below node */}
      <text
        x={cx}
        y={cy + r * 2.9 + 1.0}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="Inter, sans-serif"
        fontWeight={lit ? 500 : 400}
        fill={lit ? color : '#94a3b8'}
        opacity={isDimmed ? 0.12 : lit ? 1 : 0.55}
        letterSpacing="-0.03"
        style={{ transition: 'fill 200ms, opacity 200ms, font-weight 200ms' }}
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  )
}

function examplesNotAlreadyInSummary(summary, examples) {
  const s = (summary || '').trim()
  const lower = s.toLowerCase()
  return (examples || []).filter((ex) => {
    const t = (typeof ex === 'string' ? ex : '').trim()
    if (!t) return false
    if (t === s) return false
    if (lower.includes(t.toLowerCase())) return false
    return true
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GraphExplorer({ jsonData = null }) {
  const [zoomLevel, setZoomLevel]           = useState(0)
  const [hoveredNode, setHoveredNode]       = useState(null)
  const [activeUnitId, setActiveUnitId]     = useState('')
  const [activeConceptId, setActiveConceptId] = useState('')
  const [courseData, setCourseData]         = useState({ id: 'course', name: 'Course', units: [] })
  const [nodeOffsets, setNodeOffsets]       = useState({})   // id → {dx, dy}
  const [zoomAnim, setZoomAnim]             = useState(null) // 'in' | 'out' | null

  const stageRef      = useRef(null)
  const rafRef        = useRef(null)
  const decayRef      = useRef(null)
  const mousePosRef   = useRef(null)
  const zoomTimerRef  = useRef(null)

  const activeUnit    = courseData.units.find((u) => u.id === activeUnitId) || courseData.units[0]
  const activeConcept = activeUnit?.concepts.find((c) => c.id === activeConceptId) || null

  const conceptDetailExamples = useMemo(
    () => activeConcept ? examplesNotAlreadyInSummary(activeConcept.summary, activeConcept.examples) : [],
    [activeConcept],
  )

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeUnit && courseData.units[0]) setActiveUnitId(courseData.units[0].id)
  }, [activeUnit])

  useEffect(() => {
    if (courseData?.units?.length) { setActiveUnitId(courseData.units[0].id); setActiveConceptId('') }
  }, [courseData])

  useEffect(() => {
    if (jsonData) { setCourseData(normalizeCourseData(jsonData)); setZoomLevel(0) }
  }, [jsonData])

  // ── Layouts ─────────────────────────────────────────────────────────────────

  const unitLayouts = useMemo(
    () => (courseData.units || []).map((unit, i) => ({ unit, ...getUnitLayout(i) })),
    [courseData.units],
  )

  const conceptLayouts = useMemo(() => {
    const radius = zoomLevel >= 1 ? 30 : 16
    return getConceptLayout(activeUnit?.concepts.length || 0, 50, 50, radius)
  }, [activeUnit?.concepts.length, zoomLevel])

  // ── Base positions (before magnetic offset) ──────────────────────────────────

  const basePositions = useMemo(() => {
    const p = {}
    p[courseData.id] = { x: 50, y: 50 }
    unitLayouts.forEach(({ unit, x, y }) => {
      const isActive = unit.id === activeUnitId
      p[unit.id] = { x: isActive && zoomLevel >= 1 ? 50 : x, y: isActive && zoomLevel >= 1 ? 50 : y }
    })
    const concepts = activeUnit?.concepts || []
    concepts.forEach((concept, i) => {
      const pos = conceptLayouts[i] || { x: 50, y: 50 }
      const isFocused = concept.id === activeConceptId
      p[concept.id] = { x: isFocused ? 50 : pos.x, y: isFocused ? 50 : pos.y }
    })
    return p
  }, [courseData.id, unitLayouts, activeUnitId, zoomLevel, conceptLayouts, activeUnit, activeConceptId])

  // ── SVG coordinate conversion ─────────────────────────────────────────────

  const svgToLocal = useCallback((clientX, clientY) => {
    const svg = stageRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    try { return pt.matrixTransform(svg.getScreenCTM().inverse()) }
    catch { return null }
  }, [])

  // ── Magnetic offset computation ───────────────────────────────────────────

  const computeOffsets = useCallback((mouseX, mouseY, bases) => {
    const offsets = {}
    Object.entries(bases).forEach(([id, { x, y }]) => {
      offsets[id] = magnetOffset(x, y, mouseX, mouseY)
    })
    setNodeOffsets(offsets)
  }, [])

  const handleSvgMouseMove = useCallback((e) => {
    const pos = svgToLocal(e.clientX, e.clientY)
    if (!pos) return
    mousePosRef.current = pos
    if (decayRef.current) { cancelAnimationFrame(decayRef.current); decayRef.current = null }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      computeOffsets(pos.x, pos.y, basePositions)
    })
  }, [svgToLocal, computeOffsets, basePositions])

  // Smooth decay when mouse leaves — nodes spring back to base
  const handleSvgMouseLeave = useCallback(() => {
    mousePosRef.current = null
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    function decay() {
      setNodeOffsets(prev => {
        const next = {}
        let anyLeft = false
        Object.entries(prev).forEach(([id, off]) => {
          const ndx = off.dx * DECAY_FACTOR
          const ndy = off.dy * DECAY_FACTOR
          if (Math.abs(ndx) > 0.015 || Math.abs(ndy) > 0.015) {
            next[id] = { dx: ndx, dy: ndy }
            anyLeft = true
          } else {
            next[id] = { dx: 0, dy: 0 }
          }
        })
        if (anyLeft) decayRef.current = requestAnimationFrame(decay)
        return next
      })
    }
    decayRef.current = requestAnimationFrame(decay)
  }, [])

  // Actual position = base + magnetic offset
  const getPos = useCallback((id, fallX = 50, fallY = 50) => {
    const base = basePositions[id] || { x: fallX, y: fallY }
    const off  = nodeOffsets[id]   || { dx: 0, dy: 0 }
    return { x: base.x + off.dx, y: base.y + off.dy }
  }, [basePositions, nodeOffsets])

  // ── Zoom with animation ───────────────────────────────────────────────────

  const triggerZoomAnim = useCallback((dir) => {
    setZoomAnim(null)
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current)
    requestAnimationFrame(() => {
      setZoomAnim(dir)
      zoomTimerRef.current = setTimeout(() => setZoomAnim(null), 520)
    })
  }, [])

  const doZoomIn = useCallback((hn) => {
    triggerZoomAnim('in')
    if (zoomLevel === 0 && hn?.type === 'unit') {
      setActiveUnitId(hn.id); setActiveConceptId(''); setZoomLevel(1)
    } else if (zoomLevel === 1 && hn?.type === 'concept') {
      setActiveConceptId(hn.id); setZoomLevel(2)
    }
  }, [zoomLevel, triggerZoomAnim])

  const doZoomOut = useCallback(() => {
    triggerZoomAnim('out')
    if (zoomLevel === 2) { setZoomLevel(1); setActiveConceptId('') }
    else if (zoomLevel === 1) { setZoomLevel(0); setActiveConceptId('') }
  }, [zoomLevel, triggerZoomAnim])

  // ── Wheel handler ─────────────────────────────────────────────────────────

  const handleWheel = useCallback((e) => {
    let hn = hoveredNode
    if (!hn) {
      try {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const node = el?.closest?.('[data-nodeid]')
        if (node?.dataset?.nodeid) hn = { type: node.dataset.nodetype, id: node.dataset.nodeid }
        else return
      } catch { return }
    }
    e.preventDefault()
    if (e.deltaY < 0) doZoomIn(hn)
    else doZoomOut()
  }, [hoveredNode, doZoomIn, doZoomOut])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── Adjacency + dimming ───────────────────────────────────────────────────

  const adjacency = useMemo(() => {
    const map = {}
    const add = (a, b) => {
      if (!a || !b) return
      map[a] = map[a] || new Set(); map[a].add(b)
      map[b] = map[b] || new Set(); map[b].add(a)
    }
    unitLayouts.forEach(({ unit }) => add(courseData.id, unit.id))
    if (unitLayouts.length >= 4) {
      add(unitLayouts[0].unit.id, unitLayouts[1].unit.id)
      add(unitLayouts[2].unit.id, unitLayouts[3].unit.id)
      add(unitLayouts[0].unit.id, unitLayouts[2].unit.id)
      add(unitLayouts[1].unit.id, unitLayouts[3].unit.id)
    }
    if (activeUnit) activeUnit.concepts.forEach((c) => add(activeUnit.id, c.id))
    return map
  }, [courseData.id, unitLayouts, activeUnit])

  const isHov  = (id) => hoveredNode?.id === id
  const isDimmed = (id) => !!hoveredNode && !isHov(id) && !adjacency[hoveredNode.id]?.has(id)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const unitColor = (id) => {
    const i = courseData.units.findIndex((u) => u.id === id)
    return UNIT_COLORS[i >= 0 ? i % UNIT_COLORS.length : 0]
  }
  const activeUnitIndex = courseData.units.findIndex((u) => u.id === activeUnitId)
  const activeUnitColor = UNIT_COLORS[activeUnitIndex >= 0 ? activeUnitIndex % UNIT_COLORS.length : 0]
  const visibleConcepts = zoomLevel >= 1 ? activeUnit?.concepts || [] : []

  const litEdgeColor = (fromId, toId) => {
    if (hoveredNode?.type === 'unit') return unitColor(hoveredNode.id)
    if (hoveredNode?.type === 'concept') return activeUnitColor
    return 'rgba(148,163,184,0.7)'
  }

  // ── Edge definitions (IDs only — positions resolved at render via getPos) ──

  const unitEdgeIds = useMemo(() => {
    if (unitLayouts.length < 1) return []
    const ul = unitLayouts
    return [
      { f: courseData.id, t: ul[0]?.unit.id },
      { f: courseData.id, t: ul[1]?.unit.id },
      { f: courseData.id, t: ul[2]?.unit.id },
      { f: courseData.id, t: ul[3]?.unit.id },
      { f: ul[0]?.unit.id, t: ul[1]?.unit.id },
      { f: ul[2]?.unit.id, t: ul[3]?.unit.id },
      { f: ul[0]?.unit.id, t: ul[2]?.unit.id },
      { f: ul[1]?.unit.id, t: ul[3]?.unit.id },
    ].filter(e => e.f && e.t)
  }, [unitLayouts, courseData.id])

  const conceptEdgeIds = useMemo(() => {
    if (!activeUnit?.concepts.length) return []
    return activeUnit.concepts.map(c => ({ f: activeUnit.id, t: c.id }))
  }, [activeUnit])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="explorer-shell">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="side-nav">
        <div className="side-nav__header">
          <div className="side-nav__eyebrow">CIS 2910</div>
          <h1>{courseData.name}</h1>
          <p>One connected graph for units and concepts.</p>
        </div>

        <button
          className={`nav-item nav-item--root ${zoomLevel === 0 ? 'is-active' : ''}`}
          onClick={() => { triggerZoomAnim('out'); setZoomLevel(0); setActiveConceptId('') }}
        >
          Course Overview
        </button>

        <div className="nav-group">
          {courseData.units.map((unit, i) => {
            const isSel  = unit.id === activeUnitId
            const color  = UNIT_COLORS[i % UNIT_COLORS.length]
            return (
              <div key={unit.id} className="nav-group__block">
                <button
                  className={`nav-item ${isSel ? 'is-active' : ''}`}
                  style={{ '--accent': color }}
                  onClick={() => { triggerZoomAnim('in'); setActiveUnitId(unit.id); setActiveConceptId(''); setZoomLevel(1) }}
                >
                  <span className="nav-item__dot" style={{ background: color }} />
                  {unit.name}
                </button>
                {isSel && (
                  <div className="nav-subgroup">
                    {unit.concepts.map((concept) => (
                      <button
                        key={concept.id}
                        className={`nav-subitem ${activeConceptId === concept.id ? 'is-active' : ''}`}
                        style={{ '--accent': color }}
                        onClick={() => { triggerZoomAnim('in'); setActiveConceptId(concept.id); setZoomLevel(2) }}
                      >
                        {concept.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── Main canvas ─────────────────────────────────────────────────────── */}
      <main className="graph-workspace">
        <section className="graph-panel">

          {/* Breadcrumb */}
          <div className="zoom-crumb">
            {zoomLevel === 0 && <span>Overview</span>}
            {zoomLevel === 1 && <>
              <button onClick={() => { doZoomOut(); setZoomLevel(0); setActiveConceptId('') }}>Overview</button>
              <span>·</span><span>{activeUnit?.name}</span>
            </>}
            {zoomLevel === 2 && <>
              <button onClick={() => { triggerZoomAnim('out'); setZoomLevel(0); setActiveConceptId('') }}>Overview</button>
              <span>·</span>
              <button onClick={() => { triggerZoomAnim('out'); setZoomLevel(1); setActiveConceptId('') }}>{activeUnit?.name}</button>
              <span>·</span><span>{activeConcept?.name}</span>
            </>}
          </div>

          <svg
            ref={stageRef}
            className="graph-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={(e) => { handleSvgMouseLeave(); setHoveredNode(null) }}
            onClick={(e) => {
              if (e.target === e.currentTarget || e.target.classList.contains('svg-bg')) {
                if (zoomLevel > 0) doZoomOut()
              }
            }}
          >
            <defs>
              <filter id="glow-xs" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="0.4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* bg rect captures click-to-zoom-out */}
            <rect className="svg-bg" x={0} y={0} width={100} height={100} fill="transparent" />

            {/* Zoom-animated content group */}
            <g
              className={`graph-content ${zoomAnim ? `zoom-${zoomAnim}` : ''}`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >

              {/* ── Edges — endpoints track actual (offset) positions ─── */}
              <g>
                {zoomLevel === 0 && unitEdgeIds.map((edge, i) => {
                  const from = getPos(edge.f)
                  const to   = getPos(edge.t)
                  const lit  = hoveredNode && (edge.f === hoveredNode.id || edge.t === hoveredNode.id)
                  return (
                    <line
                      key={`ue-${i}`}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={lit ? litEdgeColor(edge.f, edge.t) : 'rgba(148,163,184,0.09)'}
                      strokeWidth={lit ? 0.3 : 0.16}
                      opacity={hoveredNode && !lit ? 0.18 : 1}
                      filter={lit ? 'url(#glow-xs)' : undefined}
                      style={{ transition: 'stroke 200ms, stroke-width 200ms, opacity 200ms' }}
                    />
                  )
                })}

                {zoomLevel >= 1 && conceptEdgeIds.map((edge, i) => {
                  const from = getPos(edge.f)
                  const to   = getPos(edge.t)
                  const lit  = hoveredNode && (edge.f === hoveredNode.id || edge.t === hoveredNode.id)
                  return (
                    <line
                      key={`ce-${i}`}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={lit ? activeUnitColor : `${activeUnitColor}25`}
                      strokeWidth={lit ? 0.3 : 0.15}
                      strokeDasharray={lit ? undefined : '0.6 0.9'}
                      opacity={hoveredNode && !lit ? 0.12 : 1}
                      filter={lit ? 'url(#glow-xs)' : undefined}
                      style={{ transition: 'stroke 200ms, stroke-width 200ms, opacity 200ms' }}
                    />
                  )
                })}
              </g>

              {/* ── Root ───────────────────────────────────────────────── */}
              {zoomLevel === 0 && (() => {
                const pos = getPos(courseData.id)
                return (
                  <g
                    data-nodeid={courseData.id}
                    data-nodetype="root"
                    onPointerEnter={() => setHoveredNode({ type: 'root', id: courseData.id })}
                    onPointerLeave={() => setHoveredNode(null)}
                  >
                    <SvgNode
                      cx={pos.x} cy={pos.y} r={2.6}
                      label={courseData.name}
                      color="#e2e8f0"
                      isHovered={isHov(courseData.id)}
                      isActive={true}
                      isDimmed={isDimmed(courseData.id)}
                      type="root"
                    />
                    {/* wider invisible hit area */}
                    <circle cx={pos.x} cy={pos.y} r={5} fill="transparent" />
                  </g>
                )
              })()}

              {/* ── Unit nodes ─────────────────────────────────────────── */}
              {unitLayouts.map(({ unit, x, y }, i) => {
                const isActive = unit.id === activeUnitId
                if (zoomLevel >= 1 && !isActive) return null
                const pos   = getPos(unit.id, x, y)
                const color = UNIT_COLORS[i % UNIT_COLORS.length]
                return (
                  <g
                    key={unit.id}
                    data-nodeid={unit.id}
                    data-nodetype="unit"
                  >
                    <SvgNode
                      cx={pos.x} cy={pos.y} r={2.0}
                      label={unit.name}
                      color={color}
                      isHovered={isHov(unit.id)}
                      isActive={isActive && zoomLevel >= 1}
                      isDimmed={isDimmed(unit.id)}
                      type="unit"
                    />
                    {/* hit area tracks the magnetically displaced position */}
                    <circle
                      cx={pos.x} cy={pos.y} r={5}
                      fill="transparent"
                      onPointerEnter={() => setHoveredNode({ type: 'unit', id: unit.id })}
                      onPointerLeave={() => setHoveredNode(null)}
                      onPointerDown={() => { setActiveUnitId(unit.id); setActiveConceptId(''); triggerZoomAnim('in'); setZoomLevel(1) }}
                      style={{ cursor: 'pointer' }}
                    />
                  </g>
                )
              })}

              {/* ── Concept nodes ──────────────────────────────────────── */}
              {visibleConcepts.map((concept, i) => {
                const isFocused = concept.id === activeConceptId
                const pos = getPos(concept.id, 50, 50)
                return (
                  <g
                    key={concept.id}
                    data-nodeid={concept.id}
                    data-nodetype="concept"
                  >
                    <SvgNode
                      cx={pos.x} cy={pos.y} r={1.6}
                      label={concept.name}
                      color={activeUnitColor}
                      isHovered={isHov(concept.id)}
                      isActive={isFocused}
                      isDimmed={isDimmed(concept.id)}
                      type="concept"
                    />
                    <circle
                      cx={pos.x} cy={pos.y} r={4}
                      fill="transparent"
                      onPointerEnter={() => setHoveredNode({ type: 'concept', id: concept.id })}
                      onPointerLeave={() => setHoveredNode(null)}
                      onPointerDown={() => { setActiveConceptId(concept.id); triggerZoomAnim('in'); setZoomLevel(2) }}
                      style={{ cursor: 'pointer' }}
                    />
                  </g>
                )
              })}

            </g>{/* /graph-content */}
          </svg>
        </section>

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        <aside className="detail-panel">
          {activeConcept ? (
            <div className="detail-card" style={{ '--accent': activeUnitColor }}>
              <div className="detail-card__eyebrow">Concept Zoom</div>
              <h2>{activeConcept.name}</h2>
              <p className="detail-card__unit">{activeUnit?.name}</p>

              <div className="detail-section">
                <h3>Summary</h3>
                <p>{activeConcept.summary || '—'}</p>
              </div>

              {conceptDetailExamples.length > 0 && (
                <div className="detail-section">
                  <h3>Examples / Formulas</h3>
                  <ul>
                    {conceptDetailExamples.map((example, index) => (
                      <li key={`${example}-${index}`}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="detail-section">
                <p className="detail-card__meta">Importance {activeConcept.importance}/5</p>
              </div>

              {activeConcept.additional?.related?.length > 0 && (
                <div className="detail-section">
                  <h3>Connected topics</h3>
                  <ul>
                    {activeConcept.additional.related.map((r) => (
                      <li key={r.id}>{r.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="detail-card detail-card--empty">
              <div className="detail-card__prompt">Small steps build strong understanding</div>
              <p>Zoom over a unit node to reveal its concepts. Zoom further into a concept node to bring its summary and formulas into view here.</p>
              <p className="detail-card__hint">Scroll over a node to zoom · Click background to zoom out</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
