import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Kotlin import headers:
 * - `import kotlin.collections.List` -> imports edge to "list"
 * - `import com.example.MyClass` -> imports edge to "myclass"
 */
function kotlinImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Try the path field first, then fall back to identifier children
  const pathNode = node.childForFieldName("path");
  let importPath: string | null = null;

  if (pathNode) {
    importPath = pathNode.text;
  } else {
    // Walk named children for identifier or dotted path
    for (const child of node.namedChildren) {
      if (child.type === "identifier" || child.type === "simple_identifier") {
        importPath = (importPath ? `${importPath}.` : "") + child.text;
      }
    }
  }

  if (!importPath) return;

  const lastSegment = importPath.split(".").pop() ?? importPath;
  // Skip wildcard "*"
  const moduleName = lastSegment === "*"
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
  wasmFile: "tree-sitter-kotlin.wasm",
  classTypes: new Set(["class_declaration", "object_declaration"]),
  functionTypes: new Set(["function_declaration"]),
  importTypes: new Set(["import_header"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["type_identifier", "simple_identifier", "identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["function_body", "class_body"],
  callFunctionField: "",
  callAccessorNodeTypes: new Set(["navigation_expression"]),
  callAccessorField: "",
  functionBoundaryTypes: new Set(["function_declaration"]),
  importHandler: kotlinImportHandler,
};
