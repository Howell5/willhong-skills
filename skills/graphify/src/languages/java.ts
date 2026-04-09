import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Java import declarations:
 * - `import java.util.List;` -> imports edge to "list"
 * - `import java.util.*;` -> imports edge to "util"
 */
function javaImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Find the scoped_identifier or identifier in the import declaration
  let importPath: string | null = null;

  for (const child of node.namedChildren) {
    if (child.type === "scoped_identifier" || child.type === "identifier") {
      importPath = child.text;
      break;
    }
    // asterisk_import: `import java.util.*`
    if (child.type === "asterisk") {
      // The preceding sibling should have the path
      importPath = node.namedChildren
        .find((c) => c.type === "scoped_identifier")
        ?.text ?? null;
      break;
    }
  }

  if (!importPath) return;

  // Extract last segment after the last dot
  const lastSegment = importPath.split(".").pop() ?? importPath;
  // Skip wildcard imports represented as "*"
  if (lastSegment === "*") {
    const segments = importPath.split(".");
    const moduleName = segments[segments.length - 2] ?? importPath;
    edges.push({
      source: fileNid,
      target: `mod::${moduleName.toLowerCase()}`,
      relation: "imports",
      confidence: "EXTRACTED",
      sourceFile: filePath,
      sourceLocation: loc,
      weight: 1.0,
    });
    return;
  }

  edges.push({
    source: fileNid,
    target: `mod::${lastSegment.toLowerCase()}`,
    relation: "imports",
    confidence: "EXTRACTED",
    sourceFile: filePath,
    sourceLocation: loc,
    weight: 1.0,
  });
}

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-java.wasm",
  classTypes: new Set(["class_declaration", "interface_declaration"]),
  functionTypes: new Set(["method_declaration", "constructor_declaration"]),
  importTypes: new Set(["import_declaration"]),
  callTypes: new Set(["method_invocation"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: [],
  callFunctionField: "name",
  callAccessorNodeTypes: new Set([]),
  callAccessorField: "",
  functionBoundaryTypes: new Set(["method_declaration", "constructor_declaration"]),
  importHandler: javaImportHandler,
};
