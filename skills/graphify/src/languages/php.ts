import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle PHP namespace use clauses:
 * - `use App\Http\Controllers\UserController;` -> imports edge to "usercontroller"
 * - `use Illuminate\Support\Facades\DB;` -> imports edge to "db"
 */
function phpImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Find the qualified_name or name child
  function extractPath(n: Parser.SyntaxNode): string | null {
    if (n.type === "qualified_name" || n.type === "name" || n.type === "identifier") {
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

  // PHP uses backslash as namespace separator
  const lastSegment = importPath.split("\\").pop() ?? importPath.split("/").pop() ?? importPath;
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
  wasmFile: "tree-sitter-php.wasm",
  classTypes: new Set(["class_declaration"]),
  functionTypes: new Set(["function_definition", "method_declaration"]),
  importTypes: new Set(["namespace_use_clause"]),
  callTypes: new Set(["function_call_expression", "member_call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["name", "identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["declaration_list", "compound_statement"],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["member_call_expression"]),
  callAccessorField: "name",
  functionBoundaryTypes: new Set(["function_definition", "method_declaration"]),
  importHandler: phpImportHandler,
};
