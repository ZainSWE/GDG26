function toTitle(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  return value.trim()
}

function splitSentences(text) {
  if (!text || typeof text !== 'string') {
    return []
  }

  return text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function extractExamples(text) {
  return splitSentences(text).filter((part) => /[=∩∪|^]|->|!=|\b\d+\b|\bexamples?\b/i.test(part))
}

/** When examples are auto-extracted from the same text as summary, drop those sentences from the summary so the UI is not repetitive. */
function stripExtractedSentencesFromSummary(summary, examples) {
  if (!summary?.trim() || !examples?.length) {
    return summary || ''
  }

  const exSet = new Set(
    examples
      .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
      .filter(Boolean),
  )
  const sentences = splitSentences(summary)
  if (!sentences.length) {
    return summary
  }

  const kept = sentences.filter((s) => !exSet.has(s.trim().toLowerCase()))
  if (!kept.length) {
    return summary
  }

  return kept.join('. ').replace(/\s*\.\s*\./g, '.').trim()
}

function conceptUsesExplicitExamplesOrFormulas(concept) {
  return (
    (Array.isArray(concept?.examples) && concept.examples.length > 0) ||
    (Array.isArray(concept?.formulas) && concept.formulas.length > 0)
  )
}

function cleanRelatedList(related) {
  if (!Array.isArray(related)) {
    return []
  }

  return related
    .map((entry) => {
      if (!entry) {
        return null
      }

      if (typeof entry === 'string') {
        return { id: entry, title: entry, content: '' }
      }

      return {
        id: entry.id || entry.key || entry.slug || entry.title || entry.name,
        title: entry.title || entry.name || entry.label || entry.id || 'Related topic',
        content: entry.content || entry.summary || entry.text || '',
      }
    })
    .filter(Boolean)
}

function normalizeConcept(concept, unitContext, index = 0, unitIndex = 0) {
  const title = toTitle(concept?.name || concept?.title || concept?.label, `Concept ${index + 1}`)
  const rawSummary = concept?.summary || concept?.content || concept?.description || concept?.text || ''
  const explicit = conceptUsesExplicitExamplesOrFormulas(concept)
  const examples = explicit
    ? Array.isArray(concept?.examples) && concept.examples.length
      ? concept.examples
      : concept.formulas
    : extractExamples(rawSummary)
  const summary = explicit ? rawSummary : stripExtractedSentencesFromSummary(rawSummary, examples)

  return {
    id: concept?.id || concept?.key || concept?.slug || `concept_${unitIndex + 1}_${index + 1}`,
    name: title,
    summary,
    examples,
    importance: concept?.importance || concept?.weight || 3,
    additional: {
      unitContext: unitContext || concept?.unitContext || concept?.parentSummary || '',
      related: cleanRelatedList(concept?.related || concept?.links || concept?.connectedTo || []),
    },
  }
}

function normalizeUnit(unit, index = 0) {
  const rawConcepts =
    unit?.concepts ||
    unit?.topics ||
    unit?.chapters ||
    unit?.sections ||
    unit?.children ||
    []

  const title = toTitle(unit?.name || unit?.title || unit?.label, `Unit ${index + 1}`)
  const summary = unit?.summary || unit?.content || unit?.description || unit?.text || ''

  return {
    id: unit?.id || unit?.key || unit?.slug || `unit_${index + 1}`,
    name: title,
    summary,
    concepts: rawConcepts.map((concept, conceptIndex) => normalizeConcept(concept, summary, conceptIndex, index)),
  }
}

function normalizeFromUnits(raw) {
  const rawUnits = raw?.units || raw?.chapters || raw?.modules || raw?.sections || []

  if (!Array.isArray(rawUnits)) {
    return null
  }

  const units = rawUnits.map((unit, index) => normalizeUnit(unit, index)).filter((unit) => unit.name)

  if (!units.length) {
    return null
  }

  return {
    id: raw?.id || raw?.courseId || raw?.slug || 'course',
    name: raw?.name || raw?.title || raw?.courseName || 'Course',
    units,
  }
}

function normalizeFromNodes(raw) {
  if (!raw?.nodes || !Array.isArray(raw.nodes)) {
    return null
  }

  const unitLikePattern = /unit|chapter|module|section/i
  const courseLikePattern = /root|course|class|overview|syllabus|curriculum|subject/i
  const nodeLabel = (node) => `${node?.id || ''} ${node?.title || ''} ${node?.name || ''} ${node?.label || ''}`
  const isUnitLikeNode = (node) => unitLikePattern.test(nodeLabel(node))
  const isCourseLikeNode = (node) => courseLikePattern.test(nodeLabel(node))

  const nodesById = Object.fromEntries(raw.nodes.map((node) => [node.id, node]))
  const rootNode =
    raw.nodes.find((node) => /^(root|course)/i.test(node.id || '')) ||
    raw.nodes.find((node) => isCourseLikeNode(node)) ||
    raw.nodes.find((node) => (node.connected || []).length > 3) ||
    raw.nodes[0]

  const candidateUnitIds = new Set()
  const unitLikeIds = new Set(raw.nodes.filter((node) => isUnitLikeNode(node)).map((node) => node.id))
  const explicitRootIds = new Set(
    raw.nodes.filter((node) => node.id === rootNode?.id || isCourseLikeNode(node)).map((node) => node.id),
  )

  // Prefer explicit unit-like labels when available.
  if (unitLikeIds.size > 0) {
    unitLikeIds.forEach((id) => candidateUnitIds.add(id))
    ;(rootNode?.connected || [])
      .filter((id) => unitLikeIds.has(id))
      .forEach((id) => candidateUnitIds.add(id))
  } else {
    // Fallback when labels are sparse: use root neighbors as probable units.
    ;(rootNode?.connected || []).forEach((id) => candidateUnitIds.add(id))
  }

  let units = Array.from(candidateUnitIds)
    .map((unitId) => nodesById[unitId])
    .filter(Boolean)
    .filter((unitNode) => !explicitRootIds.has(unitNode.id))
    .filter((unitNode) => !isCourseLikeNode(unitNode))
    .map((unitNode, unitIndex) => {
      const connectedIds = Array.isArray(unitNode.connected) ? unitNode.connected : []
      const concepts = connectedIds
        .map((conceptId) => nodesById[conceptId])
        .filter(Boolean)
        .filter((node) => node.id !== unitNode.id)
        .filter((node) => !explicitRootIds.has(node.id))
        .filter((node) => !candidateUnitIds.has(node.id))
        .filter((node) => !isUnitLikeNode(node))
        .filter((node) => !isCourseLikeNode(node))
        .map((conceptNode, conceptIndex) => {
          const related = Array.isArray(conceptNode.connected)
            ? conceptNode.connected
                .map((relatedId) => nodesById[relatedId])
                .filter((relatedNode) => relatedNode && relatedNode.id !== unitNode.id)
                .filter((relatedNode) => !explicitRootIds.has(relatedNode.id))
                .filter((relatedNode) => !isCourseLikeNode(relatedNode))
            : []

          const rawSummary =
            conceptNode.content || conceptNode.summary || conceptNode.description || ''
          const explicit = conceptUsesExplicitExamplesOrFormulas(conceptNode)
          const examples = explicit
            ? Array.isArray(conceptNode.examples) && conceptNode.examples.length
              ? conceptNode.examples
              : conceptNode.formulas
            : extractExamples(rawSummary)
          const summary = explicit ? rawSummary : stripExtractedSentencesFromSummary(rawSummary, examples)

          return {
            id: conceptNode.id || `concept_${unitIndex + 1}_${conceptIndex + 1}`,
            name: conceptNode.title || conceptNode.name || conceptNode.label || `Concept ${conceptIndex + 1}`,
            summary,
            examples,
            importance: conceptNode.importance || conceptNode.weight || 3,
            additional: {
              unitContext: unitNode.content || unitNode.summary || unitNode.description || '',
              related: related.map((relatedNode) => ({
                id: relatedNode.id,
                title: relatedNode.title || relatedNode.name || relatedNode.label || relatedNode.id,
                content: relatedNode.content || relatedNode.summary || relatedNode.description || '',
              })),
            },
          }
        })

      return {
        id: unitNode.id || `unit_${unitIndex + 1}`,
        name: unitNode.title || unitNode.name || unitNode.label || `Unit ${unitIndex + 1}`,
        summary: unitNode.content || unitNode.summary || unitNode.description || '',
        concepts,
      }
    })

  // Fallback for sparse labels: if filtering removed everything, prefer root children except course-like nodes.
  if (!units.length && Array.isArray(rootNode?.connected)) {
    units = rootNode.connected
      .map((id) => nodesById[id])
      .filter(Boolean)
      .filter((node) => !explicitRootIds.has(node.id))
      .map((unitNode, unitIndex) => ({
        id: unitNode.id || `unit_${unitIndex + 1}`,
        name: unitNode.title || unitNode.name || unitNode.label || `Unit ${unitIndex + 1}`,
        summary: unitNode.content || unitNode.summary || unitNode.description || '',
        concepts: [],
      }))
  }

  if (!units.length) {
    return null
  }

  return {
    id: raw.id || raw.courseId || rootNode?.id || 'course',
    name: raw.title || raw.name || rootNode?.title || rootNode?.name || 'Course',
    units,
  }
}

function normalizeFromArray(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    return null
  }

  const hasUnitLikeObjects = raw.some(
    (item) => item && typeof item === 'object' && (item.units || item.concepts || item.topics || item.chapters || item.sections),
  )

  if (hasUnitLikeObjects) {
    const units = raw.map((item, index) => normalizeUnit(item, index)).filter((unit) => unit.name)
    if (units.length) {
      return {
        id: 'course',
        name: 'Course',
        units,
      }
    }
  }

  return {
    id: 'course',
    name: 'Imported Course',
    units: [
      {
        id: 'unit_1',
        name: 'Imported Unit',
        summary: '',
        concepts: raw
          .map((item, index) => normalizeConcept(item, '', index, 0))
          .filter((concept) => concept.name),
      },
    ],
  }
}

export function normalizeCourseData(raw) {
  if (!raw) {
    return {
      id: 'course',
      name: 'Course',
      units: [],
    }
  }

  if (raw.units || raw.chapters || raw.modules || raw.sections) {
    const normalized = normalizeFromUnits(raw)
    if (normalized) {
      return normalized
    }
  }

  if (raw.nodes) {
    const normalized = normalizeFromNodes(raw)
    if (normalized) {
      return normalized
    }
  }

  if (Array.isArray(raw)) {
    return normalizeFromArray(raw)
  }

  const nestedCollections = [raw.course, raw.data, raw.content, raw.notes, raw.lesson, raw.document].filter(Boolean)
  for (const candidate of nestedCollections) {
    const normalized = normalizeCourseData(candidate)
    if (normalized.units.length) {
      return normalized
    }
  }

  return {
    id: raw.id || raw.courseId || 'course',
    name: raw.name || raw.title || raw.courseName || 'Course',
    units: [],
  }
}

