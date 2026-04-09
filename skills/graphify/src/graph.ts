import Graph from "graphology";
import type { ExtractionResult } from "./languages/types";

export function buildGraph(extraction: ExtractionResult): Graph {
  const g = new Graph({ multi: false, type: "undirected" });

  // Add nodes — dedup by replacing attributes on conflict (last wins)
  for (const node of extraction.nodes) {
    const { id, ...attrs } = node;
    if (g.hasNode(id)) {
      g.replaceNodeAttributes(id, attrs);
    } else {
      g.addNode(id, attrs);
    }
  }

  // Add edges — skip if either endpoint is missing
  for (const edge of extraction.edges) {
    const { source, target, ...attrs } = edge;
    if (!g.hasNode(source) || !g.hasNode(target)) continue;
    // Store original direction as _src/_tgt for reference
    g.addEdge(source, target, { ...attrs, _src: source, _tgt: target });
  }

  return g;
}

export function mergeExtractions(extractions: ExtractionResult[]): Graph {
  const merged: ExtractionResult = { nodes: [], edges: [] };
  for (const ext of extractions) {
    merged.nodes.push(...ext.nodes);
    merged.edges.push(...ext.edges);
  }
  return buildGraph(merged);
}

export function serializeGraph(g: Graph): string {
  return JSON.stringify(g.export());
}

export function deserializeGraph(json: string): Graph {
  const data = JSON.parse(json);
  const g = new Graph({ multi: false, type: "undirected" });
  g.import(data);
  return g;
}
