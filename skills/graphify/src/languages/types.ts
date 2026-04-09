import type Parser from "web-tree-sitter";

export interface ImportHandler {
  (
    node: Parser.SyntaxNode,
    source: string,
    fileNid: string,
    stem: string,
    edges: EdgeDict[],
    filePath: string,
  ): void;
}

export interface ExtraWalkHandler {
  (
    node: Parser.SyntaxNode,
    source: string,
    fileNid: string,
    stem: string,
    filePath: string,
    nodes: NodeDict[],
    edges: EdgeDict[],
    seenIds: Set<string>,
    functionBodies: [string, Parser.SyntaxNode][],
    parentClassNid: string | null,
    addNode: (nid: string, label: string, line: number) => void,
    addEdge: (src: string, tgt: string, relation: string, line: number) => void,
  ): boolean;
}

export interface ResolveFunctionNameFn {
  (node: Parser.SyntaxNode, source: string): string | null;
}

export interface LanguageConfig {
  wasmFile: string;
  classTypes: Set<string>;
  functionTypes: Set<string>;
  importTypes: Set<string>;
  callTypes: Set<string>;
  nameField: string;
  nameFallbackChildTypes: string[];
  bodyField: string;
  bodyFallbackChildTypes: string[];
  callFunctionField: string;
  callAccessorNodeTypes: Set<string>;
  callAccessorField: string;
  functionBoundaryTypes: Set<string>;
  importHandler?: ImportHandler;
  resolveFunctionNameFn?: ResolveFunctionNameFn;
  extraWalkFn?: ExtraWalkHandler;
}

export interface NodeDict {
  id: string;
  label: string;
  fileType: string;
  sourceFile: string;
  sourceLocation: string;
  semanticLabels?: string[];
}

export interface EdgeDict {
  source: string;
  target: string;
  relation: string;
  confidence: "EXTRACTED" | "INFERRED";
  sourceFile: string;
  sourceLocation: string;
  weight: number;
}

export interface ExtractionResult {
  nodes: NodeDict[];
  edges: EdgeDict[];
  error?: string;
}
