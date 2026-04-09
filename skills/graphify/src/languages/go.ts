import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Go import declarations:
 * - `import "fmt"` -> imports edge
 * - `import ("fmt" "os")` -> imports edges
 */
function goImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Walk all descendants looking for import_spec nodes
  function walkImportSpec(n: Parser.SyntaxNode): void {
    if (n.type === "import_spec") {
      // The path field is a string literal, e.g. `"fmt"`
      const pathNode = n.childForFieldName("path") ?? n.namedChildren.find((c) => c.type === "interpreted_string_literal" || c.type === "raw_string_literal");
      if (pathNode) {
        const raw = pathNode.text.replace(/^["'`]|["'`]$/g, "");
        // Extract last segment of import path
        const segment = raw.split("/").pop() ?? raw;
        const moduleName = segment.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        edges.push({
          source: fileNid,
          target: `mod::${moduleName}`,
          relation: "imports",
          confidence: "EXTRACTED",
          sourceFile: filePath,
          sourceLocation: loc,
          weight: 1.0,
        });
      }
      return;
    }
    for (const child of n.namedChildren) {
      walkImportSpec(child);
    }
  }

  walkImportSpec(node);
}

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-go.wasm",
  classTypes: new Set([]),
  functionTypes: new Set(["function_declaration", "method_declaration"]),
  importTypes: new Set(["import_declaration"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: [],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["selector_expression"]),
  callAccessorField: "field",
  functionBoundaryTypes: new Set(["function_declaration", "method_declaration"]),
  importHandler: goImportHandler,
};
