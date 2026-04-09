import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { collectFiles } from "./detect";
import { extractFile } from "./extract";
import { buildGraph, mergeExtractions, serializeGraph, deserializeGraph } from "./graph";
import { findSymbol, callersOf, calleesOf, fileSymbols, shortestPath } from "./query";
import { graphDiff } from "./diff";
import type { ExtractionResult } from "./languages/types";
import type Graph from "graphology";

// ── Public types ──────────────────────────────────────────────────────

export interface GraphifyIndex {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: { files: number; nodes: number; edges: number; builtAt: string };
}

export interface GraphNode {
  id: string;
  label: string;
  fileType: "code" | "document" | "rationale";
  sourceFile: string;
  sourceLocation: string;
  semanticLabels?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: "imports" | "imports_from" | "contains" | "method" | "calls" | "inherits" | "rationale_for";
  confidence: "EXTRACTED" | "INFERRED";
  sourceFile: string;
  sourceLocation: string;
  weight: number;
}

export interface BuildOptions {
  outputDir?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Convert a graphology graph into a portable GraphifyIndex. */
function graphToIndex(g: Graph, fileCount: number): GraphifyIndex {
  const nodes: GraphNode[] = [];
  g.forEachNode((id, attrs) => {
    nodes.push({
      id,
      label: attrs.label as string,
      fileType: (attrs.fileType as GraphNode["fileType"]) ?? "code",
      sourceFile: attrs.sourceFile as string,
      sourceLocation: attrs.sourceLocation as string,
      ...(attrs.semanticLabels ? { semanticLabels: attrs.semanticLabels as string[] } : {}),
    });
  });

  const edges: GraphEdge[] = [];
  g.forEachEdge((_edgeKey, attrs) => {
    edges.push({
      source: attrs._src as string,
      target: attrs._tgt as string,
      relation: attrs.relation as GraphEdge["relation"],
      confidence: attrs.confidence as GraphEdge["confidence"],
      sourceFile: attrs.sourceFile as string,
      sourceLocation: attrs.sourceLocation as string,
      weight: attrs.weight as number,
    });
  });

  return {
    nodes,
    edges,
    metadata: {
      files: fileCount,
      nodes: nodes.length,
      edges: edges.length,
      builtAt: new Date().toISOString(),
    },
  };
}

/** Convert a GraphifyIndex back into an ExtractionResult for graph rebuilding. */
function indexToExtraction(index: GraphifyIndex): ExtractionResult {
  return {
    nodes: index.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      fileType: n.fileType,
      sourceFile: n.sourceFile,
      sourceLocation: n.sourceLocation,
      ...(n.semanticLabels ? { semanticLabels: n.semanticLabels } : {}),
    })),
    edges: index.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      confidence: e.confidence,
      sourceFile: e.sourceFile,
      sourceLocation: e.sourceLocation,
      weight: e.weight,
    })),
  };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Build a full code-graph index for a directory.
 *
 * 1. Collect all recognised code files
 * 2. Extract AST nodes/edges from each file
 * 3. Merge into a single graph
 * 4. Optionally persist as graph.json
 */
export async function buildIndex(
  dir: string,
  options?: BuildOptions,
): Promise<GraphifyIndex> {
  const files = await collectFiles(dir);

  // Extract each file in parallel
  const extractions: ExtractionResult[] = await Promise.all(
    files.map((f) => extractFile(f.path)),
  );

  const graph = mergeExtractions(extractions);
  const index = graphToIndex(graph, files.length);

  // Persist to disk when outputDir is provided
  if (options?.outputDir) {
    await mkdir(options.outputDir, { recursive: true });
    const outPath = join(options.outputDir, "graph.json");
    await writeFile(outPath, JSON.stringify(index, null, 2), "utf-8");
  }

  return index;
}

/**
 * Query a persisted graph for symbols matching a name.
 */
export async function query(
  graphPath: string,
  question: string,
): Promise<GraphNode[]> {
  const raw = await readFile(graphPath, "utf-8");
  const index: GraphifyIndex = JSON.parse(raw);

  // Rebuild a graphology graph from the stored data
  const extraction = indexToExtraction(index);
  const graph = buildGraph(extraction);

  // Find matching symbols
  const results = findSymbol(graph, question);

  // Map back to GraphNode shape
  return results.map((r) => {
    const attrs = graph.getNodeAttributes(r.id);
    return {
      id: r.id,
      label: r.label,
      fileType: (attrs.fileType as GraphNode["fileType"]) ?? "code",
      sourceFile: r.sourceFile,
      sourceLocation: r.sourceLocation,
      ...(attrs.semanticLabels ? { semanticLabels: attrs.semanticLabels as string[] } : {}),
    };
  });
}

/**
 * Incrementally update an existing graph with changed files.
 *
 * 1. Load existing index
 * 2. Remove old nodes/edges belonging to changed files
 * 3. Re-extract changed files
 * 4. Merge and diff
 * 5. Save updated graph.json
 */
export async function updateIndex(
  graphPath: string,
  changedFiles: string[],
): Promise<{ added: number; removed: number; updated: number }> {
  const raw = await readFile(graphPath, "utf-8");
  const oldIndex: GraphifyIndex = JSON.parse(raw);

  // Rebuild old graph for diffing
  const oldExtraction = indexToExtraction(oldIndex);
  const oldGraph = buildGraph(oldExtraction);

  // Determine which files are being changed
  const changedSet = new Set(changedFiles);

  // Keep nodes/edges not belonging to changed files
  const unchangedExtraction: ExtractionResult = {
    nodes: oldIndex.nodes.filter((n) => !changedSet.has(n.sourceFile)),
    edges: oldIndex.edges.filter((e) => !changedSet.has(e.sourceFile)),
  };

  // Re-extract changed files
  const newExtractions: ExtractionResult[] = await Promise.all(
    changedFiles.map((f) => extractFile(f)),
  );

  // Merge unchanged + new
  const allExtractions = [unchangedExtraction, ...newExtractions];
  const newGraph = mergeExtractions(allExtractions);

  // Diff old vs new
  const diff = graphDiff(oldGraph, newGraph);

  // Count unique source files among the new/removed nodes to approximate "updated"
  const addedFiles = new Set(diff.newNodes.map((n) => {
    const attrs = newGraph.getNodeAttributes(n.id);
    return attrs.sourceFile as string;
  }));
  const removedFiles = new Set(diff.removedNodes.map((n) => {
    const attrs = oldGraph.getNodeAttributes(n.id);
    return attrs.sourceFile as string;
  }));

  // Files that appear in both added and removed are "updated"
  const updatedFiles = new Set([...addedFiles].filter((f) => removedFiles.has(f)));
  const pureAdded = [...addedFiles].filter((f) => !updatedFiles.has(f));
  const pureRemoved = [...removedFiles].filter((f) => !updatedFiles.has(f));

  // Calculate file count: old files minus removed plus added
  const oldFileSet = new Set(oldIndex.nodes.map((n) => n.sourceFile));
  for (const f of changedFiles) oldFileSet.add(f);
  const newIndex = graphToIndex(newGraph, oldFileSet.size);

  // Save updated graph
  await writeFile(graphPath, JSON.stringify(newIndex, null, 2), "utf-8");

  return {
    added: diff.newNodes.length,
    removed: diff.removedNodes.length,
    updated: updatedFiles.size,
  };
}

// ── Re-exports for convenience ────────────────────────────────────────

export { collectFiles, classifyFile, FileType } from "./detect";
export type { CollectedFile } from "./detect";
export { extractFile, makeId } from "./extract";
export { buildGraph, mergeExtractions, serializeGraph, deserializeGraph } from "./graph";
export { findSymbol, callersOf, calleesOf, fileSymbols, shortestPath } from "./query";
export { graphDiff } from "./diff";
export type { GraphDiff } from "./diff";
export { labelNodes } from "./semantic";
export type { SemanticLabeler, NodeSummary } from "./semantic";
