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
  const summary = concept?.summary || concept?.content || concept?.description || concept?.text || ''
  const examples = Array.isArray(concept?.examples)
    ? concept.examples
    : Array.isArray(concept?.formulas)
      ? concept.formulas
      : extractExamples(summary)

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

  const nodesById = Object.fromEntries(raw.nodes.map((node) => [node.id, node]))
  const rootNode = raw.nodes.find((node) => /^(root|course)/i.test(node.id || '')) || raw.nodes.find((node) => (node.connected || []).length > 3) || raw.nodes[0]

  const candidateUnitIds = new Set()
  ;(rootNode?.connected || []).forEach((id) => candidateUnitIds.add(id))
  raw.nodes.forEach((node) => {
    if (/unit|chapter|module|section/i.test(node.id || '') || /unit|chapter|module|section/i.test(node.title || '')) {
      candidateUnitIds.add(node.id)
    }
  })

  const units = Array.from(candidateUnitIds)
    .map((unitId) => nodesById[unitId])
    .filter(Boolean)
    .map((unitNode, unitIndex) => {
      const connectedIds = Array.isArray(unitNode.connected) ? unitNode.connected : []
      const concepts = connectedIds
        .map((conceptId) => nodesById[conceptId])
        .filter(Boolean)
        .filter((node) => node.id !== unitNode.id)
        .map((conceptNode, conceptIndex) => {
          const related = Array.isArray(conceptNode.connected)
            ? conceptNode.connected
                .map((relatedId) => nodesById[relatedId])
                .filter((relatedNode) => relatedNode && relatedNode.id !== unitNode.id)
            : []

          return {
            id: conceptNode.id || `concept_${unitIndex + 1}_${conceptIndex + 1}`,
            name: conceptNode.title || conceptNode.name || conceptNode.label || `Concept ${conceptIndex + 1}`,
            summary: conceptNode.content || conceptNode.summary || conceptNode.description || '',
            examples: Array.isArray(conceptNode.examples)
              ? conceptNode.examples
              : extractExamples(conceptNode.content || conceptNode.summary || conceptNode.description || ''),
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

const courseLoaders = import.meta.glob('../../testing/*.json')

export const courseSourceOptions = Object.keys(courseLoaders).map((path) => {
  const fileName = path.split('/').pop() || path
  return {
    value: path,
    label: fileName,
  }
})

export function getDefaultCourseSource() {
  return (
    courseSourceOptions.find((option) => /2910summary/i.test(option.label))?.value ||
    courseSourceOptions[0]?.value ||
    ''
  )
}

export async function loadCourseDataFromSource(sourcePath) {
  const loader = courseLoaders[sourcePath]

  if (!loader) {
    throw new Error(`Unknown course source: ${sourcePath}`)
  }

  const module = await loader()
  return normalizeCourseData(module.default ?? module)
}
