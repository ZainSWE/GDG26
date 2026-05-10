import summaryGraph from '../../testing/2910Summary.json'

function extractExamples(content) {
  if (!content) {
    return []
  }

  return content
    .split('.')
    .map((part) => part.trim())
    .filter((part) => /[=∩∪|^]|->|!=|\b\d+\b/.test(part))
}

const nodesById = Object.fromEntries(summaryGraph.nodes.map((node) => [node.id, node]))
const rootNode = summaryGraph.nodes.find((node) => node.id.startsWith('root_'))

const units = (rootNode?.connected || [])
  .map((unitId) => nodesById[unitId])
  .filter(Boolean)
  .map((unitNode) => {
    const concepts = (unitNode.connected || [])
      .map((conceptId) => nodesById[conceptId])
      .filter(Boolean)
      .map((conceptNode) => {
        const relatedNodes = (conceptNode.connected || [])
          .map((relatedId) => nodesById[relatedId])
          .filter((relatedNode) => relatedNode && relatedNode.id !== unitNode.id)

        return {
          id: conceptNode.id,
          name: conceptNode.title,
          summary: conceptNode.content,
          examples: extractExamples(conceptNode.content),
          importance: conceptNode.importance,
          additional: {
            unitContext: unitNode.content,
            related: relatedNodes.map((relatedNode) => ({
              id: relatedNode.id,
              title: relatedNode.title,
              content: relatedNode.content,
            })),
          },
        }
      })

    return {
      id: unitNode.id,
      name: unitNode.title,
      summary: unitNode.content,
      concepts,
    }
  })

const course = {
  id: rootNode?.id || 'cis2910',
  name: rootNode?.title || 'CIS 2910',
  units,
}

export default course
