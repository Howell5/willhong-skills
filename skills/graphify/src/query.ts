import type Graph from "graphology";
import { bidirectional } from "graphology-shortest-path";

interface QueryResult {
  id: string;
  label: string;
  sourceFile: string;
  sourceLocation: string;
}

function toResult(g: Graph, nodeId: string): QueryResult {
  const attrs = g.getNodeAttributes(nodeId);
  return {
    id: nodeId,
    label: attrs.label as string,
    sourceFile: attrs.sourceFile as string,
    sourceLocation: attrs.sourceLocation as string,
  };
}

export function findSymbol(g: Graph, name: string): QueryResult[] {
  const lower = name.toLowerCase();
  const results: QueryResult[] = [];

  g.forEachNode((nodeId, attrs) => {
    const label = (attrs.label as string) ?? "";
    // Strip leading dot (e.g. ".run" -> "run") for matching
    const cleaned = label.startsWith(".") ? label.slice(1) : label;
    if (
      cleaned.toLowerCase() === lower ||
      label.toLowerCase().includes(lower)
    ) {
      results.push(toResult(g, nodeId));
    }
  });

  return results;
}

export function calleesOf(g: Graph, nodeId: string): QueryResult[] {
  // Find nodes that nodeId calls (nodeId is _src, relation is "calls")
  const results: QueryResult[] = [];

  g.forEachEdge(nodeId, (_edge, attrs, _src, _tgt) => {
    if (attrs.relation === "calls" && attrs._src === nodeId) {
      const targetId = attrs._tgt as string;
      results.push(toResult(g, targetId));
    }
  });

  return results;
}

export function callersOf(g: Graph, nodeId: string): QueryResult[] {
  // Find nodes that call nodeId (nodeId is _tgt, relation is "calls")
  const results: QueryResult[] = [];

  g.forEachEdge(nodeId, (_edge, attrs, _src, _tgt) => {
    if (attrs.relation === "calls" && attrs._tgt === nodeId) {
      const sourceId = attrs._src as string;
      results.push(toResult(g, sourceId));
    }
  });

  return results;
}

export function fileSymbols(g: Graph, filePath: string): QueryResult[] {
  // All nodes whose sourceFile matches, excluding file-level nodes (id starts with "file::")
  const results: QueryResult[] = [];

  g.forEachNode((nodeId, attrs) => {
    if (
      attrs.sourceFile === filePath &&
      !nodeId.startsWith("file::")
    ) {
      results.push(toResult(g, nodeId));
    }
  });

  return results;
}

export function shortestPath(g: Graph, from: string, to: string): string[] | null {
  return bidirectional(g, from, to);
}
