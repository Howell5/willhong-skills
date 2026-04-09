import Parser from "web-tree-sitter";
import { readFile } from "node:fs/promises";
import { basename, extname, join, dirname } from "node:path";
import { getLanguageKey, getLanguageConfig } from "./languages/index";
import type {
  LanguageConfig,
  NodeDict,
  EdgeDict,
  ExtractionResult,
} from "./languages/types";

// Parser singleton — initialized once
let parserReady = false;

async function ensureParser(): Promise<void> {
  if (parserReady) return;
  const wasmPath = join(
    dirname(require.resolve("web-tree-sitter")),
    "tree-sitter.wasm",
  );
  await Parser.init({ locateFile: () => wasmPath });
  parserReady = true;
}

// Cache loaded languages to avoid reloading WASM files
const languageCache = new Map<string, Parser.Language>();

async function loadLanguage(wasmFile: string): Promise<Parser.Language> {
  const cached = languageCache.get(wasmFile);
  if (cached) return cached;

  const wasmPath = join(
    dirname(require.resolve("tree-sitter-wasms/package.json")),
    "out",
    wasmFile,
  );
  const lang = await Parser.Language.load(wasmPath);
  languageCache.set(wasmFile, lang);
  return lang;
}

/**
 * Build a stable node ID from parts.
 * Lowercase, alphanumeric + underscore only.
 */
export function makeId(...parts: string[]): string {
  return parts
    .join("::")
    .toLowerCase()
    .replace(/[^a-z0-9_:]/g, "_");
}

/**
 * Extract source text from a syntax node.
 */
export function readText(node: Parser.SyntaxNode, _source: string): string {
  return node.text;
}

/**
 * Get the name of a node using the config's nameField or fallback child types.
 */
function getNodeName(
  node: Parser.SyntaxNode,
  config: LanguageConfig,
): string | null {
  // Try the configured field first
  const nameNode = node.childForFieldName(config.nameField);
  if (nameNode) return nameNode.text;

  // Fallback: look for children of specific types
  for (const childType of config.nameFallbackChildTypes) {
    for (const child of node.namedChildren) {
      if (child.type === childType) return child.text;
    }
  }
  return null;
}

/**
 * Get the body of a node using the config's bodyField or fallback child types.
 */
function getNodeBody(
  node: Parser.SyntaxNode,
  config: LanguageConfig,
): Parser.SyntaxNode | null {
  // Try the configured field first
  const bodyNode = node.childForFieldName(config.bodyField);
  if (bodyNode) return bodyNode;

  // Fallback: look for children of specific types
  for (const childType of config.bodyFallbackChildTypes) {
    for (const child of node.namedChildren) {
      if (child.type === childType) return child;
    }
  }
  return null;
}

/**
 * Resolve the callee name from a call expression node.
 */
function resolveCalleeName(
  callNode: Parser.SyntaxNode,
  config: LanguageConfig,
  source: string,
): string | null {
  // Use language-specific resolver if provided
  if (config.resolveFunctionNameFn) {
    const result = config.resolveFunctionNameFn(callNode, source);
    if (result) return result;
  }

  const funcNode = callNode.childForFieldName(config.callFunctionField);
  if (!funcNode) return null;

  // Handle attribute access: obj.method() -> "method"
  if (config.callAccessorNodeTypes.has(funcNode.type)) {
    const attrNode = funcNode.childForFieldName(config.callAccessorField);
    if (attrNode) return attrNode.text;
    // Fallback: last named child of attribute node
    const lastChild = funcNode.lastNamedChild;
    if (lastChild) return lastChild.text;
  }

  // Simple function call: func()
  if (funcNode.type === "identifier" || funcNode.type === "type_identifier") {
    return funcNode.text;
  }

  return funcNode.text;
}

/**
 * Walk the AST and extract nodes and edges for a single file.
 */
function walkAst(
  rootNode: Parser.SyntaxNode,
  source: string,
  fileNid: string,
  stem: string,
  filePath: string,
  config: LanguageConfig,
): { nodes: NodeDict[]; edges: EdgeDict[] } {
  const nodes: NodeDict[] = [];
  const edges: EdgeDict[] = [];
  const seenIds = new Set<string>();
  const functionBodies: [string, Parser.SyntaxNode][] = [];

  function addNode(nid: string, label: string, line: number): void {
    if (seenIds.has(nid)) return;
    seenIds.add(nid);
    nodes.push({
      id: nid,
      label,
      fileType: "code",
      sourceFile: filePath,
      sourceLocation: `${filePath}:${line}`,
    });
  }

  function addEdge(
    src: string,
    tgt: string,
    relation: string,
    line: number,
  ): void {
    edges.push({
      source: src,
      target: tgt,
      relation,
      confidence: "EXTRACTED",
      sourceFile: filePath,
      sourceLocation: `${filePath}:${line}`,
      weight: 1.0,
    });
  }

  function walk(
    node: Parser.SyntaxNode,
    parentClassNid: string | null,
  ): void {
    const line = node.startPosition.row + 1;

    // Handle extra walk function (language-specific extensions)
    if (config.extraWalkFn) {
      const handled = config.extraWalkFn(
        node,
        source,
        fileNid,
        stem,
        filePath,
        nodes,
        edges,
        seenIds,
        functionBodies,
        parentClassNid,
        addNode,
        addEdge,
      );
      if (handled) return;
    }

    // Handle imports
    if (config.importTypes.has(node.type)) {
      if (config.importHandler) {
        config.importHandler(node, source, fileNid, stem, edges, filePath);
      }
      return;
    }

    // Handle classes
    if (config.classTypes.has(node.type)) {
      const className = getNodeName(node, config);
      if (!className) return;

      const classNid = makeId(stem, className);
      addNode(classNid, className, line);
      addEdge(fileNid, classNid, "contains", line);

      // Handle Python-style inheritance via superclasses/argument_list
      handleInheritance(node, classNid, stem, filePath, line, edges);

      // Recurse into the class body
      const body = getNodeBody(node, config);
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, classNid);
        }
      }
      return;
    }

    // Handle functions
    if (config.functionTypes.has(node.type)) {
      const funcName = getNodeName(node, config);
      if (!funcName) return;

      const funcNid = parentClassNid
        ? makeId(parentClassNid, funcName)
        : makeId(stem, funcName);
      const label = parentClassNid ? `.${funcName}` : funcName;
      addNode(funcNid, label, line);

      if (parentClassNid) {
        addEdge(parentClassNid, funcNid, "method", line);
      } else {
        addEdge(fileNid, funcNid, "contains", line);
      }

      // Save function body for call-graph pass
      const body = getNodeBody(node, config);
      if (body) {
        functionBodies.push([funcNid, body]);
      }
      return;
    }

    // Recurse into children for other node types
    for (const child of node.namedChildren) {
      walk(child, parentClassNid);
    }
  }

  walk(rootNode, null);

  // Second pass: walk function bodies for call edges
  for (const [funcNid, body] of functionBodies) {
    walkCallsInBody(body, funcNid, source, filePath, config, edges, seenIds);
  }

  return { nodes, edges };
}

/**
 * Handle inheritance edges (Python: class Foo(Bar, Baz))
 */
function handleInheritance(
  node: Parser.SyntaxNode,
  classNid: string,
  stem: string,
  filePath: string,
  line: number,
  edges: EdgeDict[],
): void {
  // Python: superclasses field contains argument_list
  const superclasses = node.childForFieldName("superclasses");
  if (!superclasses) return;

  for (const child of superclasses.namedChildren) {
    if (child.type === "identifier" || child.type === "dotted_name" || child.type === "attribute") {
      const parentName = child.text;
      const parentNid = makeId(stem, parentName);
      edges.push({
        source: classNid,
        target: parentNid,
        relation: "inherits",
        confidence: "EXTRACTED",
        sourceFile: filePath,
        sourceLocation: `${filePath}:${line}`,
        weight: 1.0,
      });
    }
  }
}

/**
 * Walk a function body to find call expressions and create call edges.
 */
function walkCallsInBody(
  body: Parser.SyntaxNode,
  funcNid: string,
  source: string,
  filePath: string,
  config: LanguageConfig,
  edges: EdgeDict[],
  _seenIds: Set<string>,
): void {
  function walkCalls(node: Parser.SyntaxNode): void {
    if (config.callTypes.has(node.type)) {
      const calleeName = resolveCalleeName(node, config, source);
      if (calleeName) {
        const line = node.startPosition.row + 1;
        edges.push({
          source: funcNid,
          target: calleeName,
          relation: "calls",
          confidence: "INFERRED",
          sourceFile: filePath,
          sourceLocation: `${filePath}:${line}`,
          weight: 0.8,
        });
      }
    }

    // Don't cross into nested function/class definitions
    if (
      config.functionBoundaryTypes.has(node.type) &&
      node !== body
    ) {
      return;
    }

    for (const child of node.namedChildren) {
      walkCalls(child);
    }
  }

  walkCalls(body);
}

/**
 * Extract nodes and edges from a single source file.
 */
export async function extractFile(
  filePath: string,
): Promise<ExtractionResult> {
  try {
    const ext = extname(filePath);
    const langKey = getLanguageKey(ext);
    if (!langKey) {
      return { nodes: [], edges: [], error: `Unsupported extension: ${ext}` };
    }

    const config = await getLanguageConfig(langKey);
    if (!config) {
      return { nodes: [], edges: [], error: `No config for language: ${langKey}` };
    }

    // Read source file
    const source = await readFile(filePath, "utf-8");

    // Initialize parser and load grammar
    await ensureParser();
    const language = await loadLanguage(config.wasmFile);
    const parser = new Parser();
    parser.setLanguage(language);

    // Parse the source
    const tree = parser.parse(source);
    const rootNode = tree.rootNode;

    // Build file node
    const fileName = basename(filePath);
    const stem = fileName.replace(extname(fileName), "");
    const fileNid = makeId("file", stem);

    const nodes: NodeDict[] = [
      {
        id: fileNid,
        label: fileName,
        fileType: "code",
        sourceFile: filePath,
        sourceLocation: `${filePath}:1`,
      },
    ];
    const edges: EdgeDict[] = [];

    // Walk the AST
    const result = walkAst(rootNode, source, fileNid, stem, filePath, config);
    nodes.push(...result.nodes);
    edges.push(...result.edges);

    // Clean up
    tree.delete();
    parser.delete();

    return { nodes, edges };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { nodes: [], edges: [], error: message };
  }
}
