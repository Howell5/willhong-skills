import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Scala import declarations:
 * - `import scala.collection.mutable.ListBuffer` -> imports edge to "listbuffer"
 * - `import scala.collection.mutable._` -> imports edge to "mutable"
 */
function scalaImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Find stable_id or identifier child
  function extractPath(n: Parser.SyntaxNode): string | null {
    if (n.type === "stable_id" || n.type === "type_identifier" || n.type === "identifier") {
      return n.text;
    }
    for (const child of n.namedChildren) {
      const result = extractPath(child);
      if (result) return result;
    }
    return null;
  }

  const importPath = extractPath(node);
  if (!importPath) return;

  const lastSegment = importPath.split(".").pop() ?? importPath;
  const moduleName = lastSegment === "_"
    ? (importPath.split(".").slice(-2, -1)[0] ?? importPath)
    : lastSegment;

  edges.push({
    source: fileNid,
    target: `mod::${moduleName.toLowerCase()}`,
    relation: "imports",
    confidence: "EXTRACTED",
    sourceFile: filePath,
    sourceLocation: loc,
    weight: 1.0,
  });
}

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-scala.wasm",
  classTypes: new Set(["class_definition", "object_definition"]),
  functionTypes: new Set(["function_definition"]),
  importTypes: new Set(["import_declaration"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier", "type_identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["template_body"],
  callFunctionField: "",
  callAccessorNodeTypes: new Set(["field_expression"]),
  callAccessorField: "field",
  functionBoundaryTypes: new Set(["function_definition"]),
  importHandler: scalaImportHandler,
};
