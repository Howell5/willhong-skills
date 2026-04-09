import type Graph from "graphology";

export interface GraphDiff {
  newNodes: { id: string; label: string }[];
  removedNodes: { id: string; label: string }[];
  newEdges: { source: string; target: string; relation: string }[];
  removedEdges: { source: string; target: string; relation: string }[];
  summary: string;
}

/**
 * Build a stable key for an edge so direction doesn't matter.
 * Sorts source and target alphabetically, then appends relation.
 */
function edgeKey(source: string, target: string, relation: string): string {
  const [a, b] = source <= target ? [source, target] : [target, source];
  return `${a}::${b}::${relation}`;
}

export function graphDiff(oldGraph: Graph, newGraph: Graph): GraphDiff {
  // Compare node sets
  const oldNodeIds = new Set<string>(oldGraph.nodes());
  const newNodeIds = new Set<string>(newGraph.nodes());

  const newNodes = newGraph
    .nodes()
    .filter((id) => !oldNodeIds.has(id))
    .map((id) => ({ id, label: newGraph.getNodeAttribute(id, "label") as string }));

  const removedNodes = oldGraph
    .nodes()
    .filter((id) => !newNodeIds.has(id))
    .map((id) => ({ id, label: oldGraph.getNodeAttribute(id, "label") as string }));

  // Compare edge sets using a canonical key
  const oldEdgeKeys = new Map<string, { source: string; target: string; relation: string }>();
  oldGraph.edges().forEach((edgeId) => {
    const source = oldGraph.source(edgeId);
    const target = oldGraph.target(edgeId);
    const relation = oldGraph.getEdgeAttribute(edgeId, "relation") as string;
    oldEdgeKeys.set(edgeKey(source, target, relation), { source, target, relation });
  });

  const newEdgeKeys = new Map<string, { source: string; target: string; relation: string }>();
  newGraph.edges().forEach((edgeId) => {
    const source = newGraph.source(edgeId);
    const target = newGraph.target(edgeId);
    const relation = newGraph.getEdgeAttribute(edgeId, "relation") as string;
    newEdgeKeys.set(edgeKey(source, target, relation), { source, target, relation });
  });

  const newEdges = [...newEdgeKeys.entries()]
    .filter(([key]) => !oldEdgeKeys.has(key))
    .map(([, edge]) => edge);

  const removedEdges = [...oldEdgeKeys.entries()]
    .filter(([key]) => !newEdgeKeys.has(key))
    .map(([, edge]) => edge);

  // Build summary string
  const hasChanges =
    newNodes.length > 0 ||
    removedNodes.length > 0 ||
    newEdges.length > 0 ||
    removedEdges.length > 0;

  const summary = hasChanges
    ? [
        newNodes.length > 0 ? `+${newNodes.length} node(s)` : null,
        removedNodes.length > 0 ? `-${removedNodes.length} node(s)` : null,
        newEdges.length > 0 ? `+${newEdges.length} edge(s)` : null,
        removedEdges.length > 0 ? `-${removedEdges.length} edge(s)` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "no changes";

  return { newNodes, removedNodes, newEdges, removedEdges, summary };
}
