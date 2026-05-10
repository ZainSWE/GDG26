import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { normalizeCourseData } from '../data/courseData'
import { useMagneticGroup } from '../hooks/useMagneticButton'
import './GraphExplorer.css'

// ── Magnetic pull constants ──────────────────────────────────────────────────
const MAGNET_RADIUS   = 8    // smaller field — far less sticky
const MAGNET_STRENGTH = 0.9  // max displacement in SVG units — much gentler
const DECAY_FACTOR    = 0.93 // higher = slower, smoother spring-back

// ── Zoom transition durations ─────────────────────────────────────────────────
const FADE_OUT_MS = 680  // ms to fade out before state switch
const FADE_IN_MS  = 720  // ms for new nodes to appear

function magnetOffset(nodeCx, nodeCy, mouseX, mouseY) {
  const dx = mouseX - nodeCx
  const dy = mouseY - nodeCy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > MAGNET_RADIUS || dist < 0.001) return { dx: 0, dy: 0 }
  const t = 1 - dist / MAGNET_RADIUS
  const force = t * t * t * MAGNET_STRENGTH // cubic falloff — very gradual entry
  return { dx: (dx / dist) * force, dy: (dy / dist) * force }
}

function toPoint(percentX, percentY) {
  return { x: percentX, y: percentY }
}

function getUnitLayout(index, total) {
  // Radial star — identical to how concepts orbit their unit
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2
  const radius = 33
  return toPoint(50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius)
}

function getConceptLayout(count, centerX, centerY, radius = 28) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2
    return toPoint(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
  })
}

// ─── Single SVG node ─────────────────────────────────────────────────────────
// All child elements placed at (0,0); outer <g> uses SVG transform="translate"
// so the ring-spin group can pivot at transformOrigin:'0 0' — perfectly centered.

function SvgNode({ cx, cy, r, label, isHovered, isActive, isDimmed, type, nodeIndex = 0 }) {
  const opacity  = isDimmed ? 0.15 : 1
  const fontSize = type === 'root' ? 2.2 : type === 'unit' ? 1.9 : 1.65

  // ringR sits so its inner edge exactly meets the glass core outer edge — no gap
  const ringW    = r * 0.13
  const ringR    = r + ringW / 2

  const gradId   = `rg-${type}-${nodeIndex}`
  const blurId   = `rb-${type}-${nodeIndex}`

  const spinDur  = isActive ? '3.5s' : `${5 + (nodeIndex % 8) * 0.9}s`
  const bloomOp  = isActive ? 0.78 : isHovered ? 0.58 : 0.46
  const blurSd   = isActive ? r * 1.1 : r * 0.65

  const labelY   = ringR + ringW / 2 + fontSize * 1.4 + 0.8

  // Glass fill opacity — matches other glass panels: barely-there white tint
  const glassFill   = isActive
    ? 'rgba(30,0,65,0.55)'
    : isHovered
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(255,255,255,0.05)'
  // Glass inner border — the 1-px white rim every glassmorphism element has
  const glassStroke = isActive
    ? 'rgba(255,255,255,0.20)'
    : 'rgba(255,255,255,0.10)'

  return (
    <g transform={`translate(${cx},${cy})`} style={{ opacity, transition: 'opacity 300ms ease' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3c0062" />
          <stop offset="50%"  stopColor="#9d00ff" />
          <stop offset="100%" stopColor="#c569ff" />
        </linearGradient>
        <filter id={blurId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation={blurSd} />
        </filter>
      </defs>

      {/* Spinning glow ring */}
      <g style={{
        transformOrigin: '0 0',
        animationName: 'ring-spin',
        animationDuration: spinDur,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}>
        <circle r={ringR} fill="none"
          stroke={isActive ? '#bf00ff' : `url(#${gradId})`}
          strokeWidth={ringW * 14} opacity={bloomOp * 0.28}
          filter={`url(#${blurId})`}
        />
        <circle r={ringR} fill="none"
          stroke={isActive ? '#08001a' : `url(#${gradId})`}
          strokeWidth={ringW * 6} opacity={bloomOp * 0.55}
          filter={`url(#${blurId})`}
        />
        <circle r={ringR} fill="none"
          stroke={isActive ? '#a600ff' : `url(#${gradId})`}
          strokeWidth={ringW} opacity={isActive ? 1 : 0.9}
        />
      </g>

      {/* ── Glassmorphism core ──────────────────────────────────────────────
          Uniform semi-transparent fill: background bleeds through = frosted glass.
          No gradients, no sphere shading — same visual language as the panels.       */}
      <circle r={r} fill={glassFill} />
      {/* Full-circle inner border — matches the 1px rim on every glass card */}
      <circle r={r} fill="none" stroke={glassStroke} strokeWidth={ringW * 0.55} />

      {/* Label */}
      <text
        y={labelY}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="Inter, sans-serif"
        fontWeight={isActive ? 600 : isHovered ? 500 : 400}
        fill={isActive ? '#ffffff' : isHovered ? '#e2e8f0' : 'rgba(255,255,255,0.72)'}
        letterSpacing="-0.02"
        style={{ transition: 'fill 200ms, font-weight 200ms' }}
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
  const [zoomPhase, setZoomPhase]           = useState('idle') // 'idle' | 'fade-out' | 'fade-in'
  const [zoomTargetId, setZoomTargetId]     = useState(null)  // node id that scales during fade-out
  const [zoomDir, setZoomDir]               = useState('in')  // 'in' | 'out'
  const [detailCollapsed, setDetailCollapsed] = useState(false)

  const stageRef           = useRef(null)
  const sideNavRef         = useRef(null)
  const detailRef          = useRef(null)
  const rafRef             = useRef(null)
  const decayRef           = useRef(null)
  const mousePosRef        = useRef(null)
  const transitionTimerRef = useRef(null)

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
    () => (courseData.units || []).map((unit, i, arr) => ({ unit, ...getUnitLayout(i, arr.length) })),
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
      if (isActive && zoomLevel === 1) p[unit.id] = { x: 50, y: 50 }
      else if (isActive && zoomLevel === 2) p[unit.id] = { x: 50, y: 10 }  // parent indicator at top
      else p[unit.id] = { x, y }
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

  // ── Zoom with slow fade-out → state switch → fade-in transition ────────────

  const navZoomTo = useCallback((nextLevel, nextUnitId, nextConceptId = '', targetId = null, dir = 'in') => {
    if (zoomPhase !== 'idle') return
    setZoomTargetId(targetId)
    setZoomDir(dir)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    setZoomPhase('fade-out')
    transitionTimerRef.current = setTimeout(() => {
      setZoomLevel(nextLevel)
      setActiveUnitId(nextUnitId)
      setActiveConceptId(nextConceptId)
      setZoomTargetId(null)
      setZoomPhase('fade-in')
      transitionTimerRef.current = setTimeout(() => setZoomPhase('idle'), FADE_IN_MS)
    }, FADE_OUT_MS)
  }, [zoomPhase])

  const doZoomIn = useCallback((hn) => {
    if (zoomLevel === 0 && hn?.type === 'unit') {
      navZoomTo(1, hn.id, '', hn.id, 'in')
    } else if (zoomLevel === 1 && hn?.type === 'concept') {
      navZoomTo(2, activeUnitId, hn.id, hn.id, 'in')
    }
  }, [zoomLevel, activeUnitId, navZoomTo])

  const doZoomOut = useCallback(() => {
    if (zoomLevel === 2) navZoomTo(1, activeUnitId, '', activeConceptId, 'out')
    else if (zoomLevel === 1) navZoomTo(0, activeUnitId, '', activeUnitId, 'out')
  }, [zoomLevel, activeUnitId, activeConceptId, navZoomTo])

  // ── Magnetic effect on sidebar nav buttons ──────────────────────────────────
  useMagneticGroup(sideNavRef, '.nav-item', 0.28)

  // ── Block ctrl+scroll browser zoom without affecting normal page scrolling ──
  useEffect(() => {
    const prevent = (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }
    document.addEventListener('wheel', prevent, { passive: false })
    return () => document.removeEventListener('wheel', prevent)
  }, [])

  // ── GSAP: sidebar entrance — stagger nav tiles in from the left on mount ──
  useEffect(() => {
    if (!sideNavRef.current) return
    const items = sideNavRef.current.querySelectorAll('.nav-item, .nav-subitem')
    if (!items.length) return
    gsap.fromTo(items,
      { x: -18, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.42, stagger: 0.045, ease: 'power2.out', clearProps: 'x,opacity' }
    )
  }, [courseData])

  // ── GSAP: detail panel — fade + slide up when active concept changes ──
  useEffect(() => {
    if (!detailRef.current) return
    gsap.fromTo(detailRef.current,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.36, ease: 'power2.out', clearProps: 'y,opacity' }
    )
  }, [activeConceptId])

  // ── Adjacency + dimming ───────────────────────────────────────────────────

  const adjacency = useMemo(() => {
    const map = {}
    const add = (a, b) => {
      if (!a || !b) return
      map[a] = map[a] || new Set(); map[a].add(b)
      map[b] = map[b] || new Set(); map[b].add(a)
    }
    // Spokes from center + ring between adjacent units
    unitLayouts.forEach(({ unit }, i) => {
      add(courseData.id, unit.id)
      add(unit.id, unitLayouts[(i + 1) % unitLayouts.length].unit.id)
    })
    if (activeUnit) activeUnit.concepts.forEach((c) => add(activeUnit.id, c.id))
    return map
  }, [courseData.id, unitLayouts, activeUnit])

  const isHov  = (id) => hoveredNode?.id === id
  const isDimmed = (id) => !!hoveredNode && !isHov(id) && !adjacency[hoveredNode.id]?.has(id)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const visibleConcepts = zoomLevel >= 1 ? activeUnit?.concepts || [] : []

  const litEdgeColor = () => 'rgba(85,1,163,0.7)'

  // ── Edge definitions (IDs only — positions resolved at render via getPos) ──

  const unitEdgeIds = useMemo(() => {
    if (unitLayouts.length < 1) return []
    const spokes = unitLayouts.map(({ unit }) => ({ f: courseData.id, t: unit.id }))
    const ring   = unitLayouts.map(({ unit }, i) => ({
      f: unit.id,
      t: unitLayouts[(i + 1) % unitLayouts.length].unit.id,
    }))
    return [...spokes, ...ring].filter(e => e.f && e.t)
  }, [unitLayouts, courseData.id])

  const conceptEdgeIds = useMemo(() => {
    if (!activeUnit?.concepts.length) return []
    if (zoomLevel >= 2 && activeConceptId) {
      // At zoom 2: unit→focused + focused→sibling concepts (focused concept acts as hub)
      return [
        { f: activeUnit.id, t: activeConceptId },
        ...activeUnit.concepts
          .filter(c => c.id !== activeConceptId)
          .map(c => ({ f: activeConceptId, t: c.id })),
      ]
    }
    return activeUnit.concepts.map(c => ({ f: activeUnit.id, t: c.id }))
  }, [activeUnit, zoomLevel, activeConceptId])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="explorer-shell">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="side-nav" ref={sideNavRef}>
        <div className="side-nav__header">
          <div className="side-nav__eyebrow">CIS 2910</div>
          <h1>{courseData.name}</h1>
          <p>One connected graph for units and concepts.</p>
        </div>

        <button
          className={`nav-item nav-item--root ${zoomLevel === 0 ? 'is-active' : ''}`}
          onClick={() => navZoomTo(0, activeUnitId, '')}
        >
          Course Overview
        </button>

        <div className="nav-group">
          {courseData.units.map((unit, i) => {
            const isSel  = unit.id === activeUnitId
            return (
              <div key={unit.id} className="nav-group__block">
                <button
                  className={`nav-item ${isSel ? 'is-active' : ''}`}
                  onClick={() => navZoomTo(1, unit.id, '')}
                >
                  <span className="nav-item__dot" />
                  {unit.name}
                </button>
                {isSel && (
                  <div className="nav-subgroup">
                    {unit.concepts.map((concept) => (
                      <button
                        key={concept.id}
                        className={`nav-subitem ${activeConceptId === concept.id ? 'is-active' : ''}`}
                        onClick={() => navZoomTo(2, unit.id, concept.id)}
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
      <main className={`graph-workspace${detailCollapsed ? ' detail-collapsed' : ''}`}>
        <section className="graph-panel">

          {/* Breadcrumb */}
          <div className="zoom-crumb">
            {zoomLevel === 0 && <span>Overview</span>}
            {zoomLevel === 1 && <>
              <button onClick={() => navZoomTo(0, activeUnitId, '')}>Overview</button>
              <span>·</span><span>{activeUnit?.name}</span>
            </>}
            {zoomLevel === 2 && <>
              <button onClick={() => navZoomTo(0, activeUnitId, '')}>Overview</button>
              <span>·</span>
              <button onClick={() => navZoomTo(1, activeUnitId, '')}>{activeUnit?.name}</button>
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
              className="graph-content"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                pointerEvents: zoomPhase !== 'idle' ? 'none' : undefined,
                ...(zoomPhase === 'fade-out' && { opacity: 0, transition: 'opacity 680ms ease' }),
                ...(zoomPhase === 'fade-in'  && { animation: 'content-fade-in 720ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }),
              }}
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
                      stroke={lit ? 'rgba(85,1,163,0.9)' : 'rgba(85,1,163,0.18)'}
                      strokeWidth={lit ? 0.28 : 0.14}
                      opacity={hoveredNode && !lit ? 0.15 : 1}
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
                      stroke={lit ? 'rgba(85,1,163,0.9)' : 'rgba(85,1,163,0.18)'}
                      strokeWidth={lit ? 0.28 : 0.14}
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
                    {/* inner <g> carries the continuous float animation */}
                    <g style={{ transformBox: 'fill-box', transformOrigin: '50% 50%', animationName: 'node-float', animationDuration: '5.2s', animationDelay: '0s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}>
                      <SvgNode
                        cx={pos.x} cy={pos.y} r={2.6}
                        label={courseData.name}
                        nodeIndex={0}
                        isHovered={isHov(courseData.id)}
                        isActive={true}
                        isDimmed={isDimmed(courseData.id)}
                        type="root"
                      />
                      {/* wider invisible hit area */}
                      <circle cx={pos.x} cy={pos.y} r={5} fill="transparent" />
                    </g>
                  </g>
                )
              })()}

              {/* ── Unit nodes ─────────────────────────────────────────── */}
              {unitLayouts.map(({ unit, x, y }, i) => {
                const isActive = unit.id === activeUnitId
                if (zoomLevel >= 1 && !isActive) return null
                const pos       = getPos(unit.id, x, y)
                // zoom 1 = center (big, white ring); zoom 2 = parent indicator at top (small)
                const nodeR     = isActive && zoomLevel === 1 ? 3.2 : isActive && zoomLevel === 2 ? 1.4 : 2.0
                const floatDur   = `${4.6 + i * 0.65}s`
                const floatDelay = `${-i * 1.55}s`
                const isZoomTarget = zoomPhase === 'fade-out' && zoomTargetId === unit.id
                const innerStyle = isZoomTarget
                  ? { transformBox: 'fill-box', transformOrigin: '50% 50%', animationName: zoomDir === 'in' ? 'node-zoom-in' : 'node-zoom-out', animationDuration: `${FADE_OUT_MS}ms`, animationTimingFunction: 'ease-in', animationIterationCount: 1, animationFillMode: 'forwards' }
                  : { transformBox: 'fill-box', transformOrigin: '50% 50%', animationName: 'node-float', animationDuration: floatDur, animationDelay: floatDelay, animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }
                return (
                  <g
                    key={unit.id}
                    data-nodeid={unit.id}
                    data-nodetype="unit"
                  >
                    {/* inner <g> carries float or zoom animation */}
                    <g style={innerStyle}>
                      <SvgNode
                        cx={pos.x} cy={pos.y} r={nodeR}
                        label={unit.name}
                        nodeIndex={i + 1}
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
                        onPointerDown={() => navZoomTo(1, unit.id, '', unit.id, 'in')}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  </g>
                )
              })}

              {/* ── Concept nodes ──────────────────────────────────────── */}
              {visibleConcepts.map((concept, i) => {
                const isFocused = concept.id === activeConceptId
                const pos       = getPos(concept.id, 50, 50)
                // Focused at center = big, active ring; orbiting siblings = smaller
                const nodeR     = isFocused && zoomLevel >= 2 ? 3.0 : 1.6
                const floatDur   = `${3.9 + i * 0.55}s`
                const floatDelay = `${-(i * 1.2 + 0.8)}s`
                const isZoomTarget = zoomPhase === 'fade-out' && zoomTargetId === concept.id
                const innerStyle = isZoomTarget
                  ? { transformBox: 'fill-box', transformOrigin: '50% 50%', animationName: zoomDir === 'in' ? 'node-zoom-in' : 'node-zoom-out', animationDuration: `${FADE_OUT_MS}ms`, animationTimingFunction: 'ease-in', animationIterationCount: 1, animationFillMode: 'forwards' }
                  : { transformBox: 'fill-box', transformOrigin: '50% 50%', animationName: 'node-float', animationDuration: floatDur, animationDelay: floatDelay, animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }
                return (
                  <g
                    key={concept.id}
                    data-nodeid={concept.id}
                    data-nodetype="concept"
                  >
                    <g style={innerStyle}>
                      <SvgNode
                        cx={pos.x} cy={pos.y} r={nodeR}
                        label={concept.name}
                        nodeIndex={i + 10}
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
                        onPointerDown={() => navZoomTo(2, activeUnitId, concept.id, concept.id, 'in')}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  </g>
                )
              })}

            </g>{/* /graph-content */}
          </svg>
        </section>

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        <aside className={`detail-panel${detailCollapsed ? ' detail-panel--collapsed' : ''}`} ref={detailRef}>
          {detailCollapsed ? (
            <div
              className="detail-card"
              onClick={() => setDetailCollapsed(false)}
              title="Expand panel"
            >
              <div className="detail-card__collapsed-label">
                {activeConcept ? activeConcept.name : 'Details'} ›
              </div>
            </div>
          ) : activeConcept ? (
            <div className="detail-card" style={{ '--accent': '#5501a3' }}>
              <h2>{activeConcept.name}</h2>
              <div className="detail-card__meta-row">
                <span className="detail-card__unit">{activeUnit?.name}</span>
                {activeConcept.importance > 0 && (
                  <span className="detail-card__importance">
                    {'★'.repeat(activeConcept.importance)}{'☆'.repeat(5 - activeConcept.importance)}
                  </span>
                )}
              </div>

              <div className="detail-card__body">
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
            </div>
          ) : (
            <div className="detail-card detail-card--empty">
              <div className="detail-card__body">
                <div className="detail-card__prompt">Small steps build strong understanding</div>
                <p>Click a unit node to reveal its concepts. Click a concept node to see its details.</p>
                <p className="detail-card__hint">Click a node to navigate · Click the background to go back</p>
              </div>
            </div>
          )}
          {!detailCollapsed && (
            <button
              className="detail-collapse-btn"
              onClick={() => setDetailCollapsed(true)}
            >
              ‹ Minimize
            </button>
          )}
        </aside>
      </main>
    </div>
  )
}
