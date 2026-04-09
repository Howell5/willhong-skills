import type Parser from "web-tree-sitter";
import type {
  LanguageConfig,
  EdgeDict,
  ExtraWalkHandler,
} from "./types";

/**
 * Handle JS/TS import statements:
 * - `import { x } from './module'` -> imports edge
 * - `import path from 'path'` -> imports edge
 */
function jsImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  if (node.type !== "import_statement") return;

  // Find the string child that holds the module path
  const sourceNode = node.childForFieldName("source");
  const stringNode = sourceNode ?? node.namedChildren.find((c) => c.type === "string");
  if (!stringNode) return;

  // Strip quotes from the raw text
  const raw = stringNode.text.replace(/^['"`]|['"`]$/g, "");

  // Extract the last segment of the path as module name, strip leading "./"
  const segment = raw.split("/").pop() ?? raw;
  const moduleName = segment.replace(/^\.\//, "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const targetNid = `mod::${moduleName}`;

  edges.push({
    source: fileNid,
    target: targetNid,
    relation: "imports",
    confidence: "EXTRACTED",
    sourceFile: filePath,
    sourceLocation: loc,
    weight: 1.0,
  });
}

/**
 * Handle arrow function declarations:
 * `const foo = (args) => { ... }`
 * Emits a function node + "contains" edge for each arrow function assigned to a variable.
 */
const arrowFunctionHandler: ExtraWalkHandler = (
  node,
  _source,
  fileNid,
  stem,
  _filePath,
  _nodes,
  _edges,
  _seenIds,
  functionBodies,
  parentClassNid,
  addNode,
  addEdge,
): boolean => {
  if (node.type !== "lexical_declaration") return false;

  let handled = false;
  const line = node.startPosition.row + 1;

  for (const child of node.namedChildren) {
    if (child.type !== "variable_declarator") continue;

    const valueNode = child.childForFieldName("value");
    if (!valueNode || valueNode.type !== "arrow_function") continue;

    const nameNode = child.childForFieldName("name");
    if (!nameNode) continue;

    const funcName = nameNode.text;
    const funcNid = parentClassNid
      ? `${parentClassNid}::${funcName.toLowerCase()}`
      : `${stem}::${funcName.toLowerCase()}`;

    addNode(funcNid, funcName, line);
    addEdge(fileNid, funcNid, "contains", line);

    // Save arrow function body for call-graph pass
    const body = valueNode.childForFieldName("body");
    if (body) {
      functionBodies.push([funcNid, body]);
    }

    handled = true;
  }

  return handled;
};

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-javascript.wasm",
  classTypes: new Set(["class_declaration"]),
  functionTypes: new Set(["function_declaration", "method_definition"]),
  importTypes: new Set(["import_statement"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier", "property_identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["statement_block"],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["member_expression"]),
  callAccessorField: "property",
  functionBoundaryTypes: new Set([
    "function_declaration",
    "arrow_function",
    "method_definition",
  ]),
  importHandler: jsImportHandler,
  extraWalkFn: arrowFunctionHandler,
};

export const tsConfig: LanguageConfig = {
  ...config,
  wasmFile: "tree-sitter-typescript.wasm",
};
