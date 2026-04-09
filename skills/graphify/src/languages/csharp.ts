import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle C# using directives:
 * - `using System.Collections.Generic;` -> imports edge to "generic"
 * - `using System;` -> imports edge to "system"
 */
function csharpImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Find qualified_name or identifier child
  let importPath: string | null = null;

  for (const child of node.namedChildren) {
    if (
      child.type === "qualified_name" ||
      child.type === "identifier" ||
      child.type === "name_equals" // `using Alias = ...`
    ) {
      importPath = child.text;
      break;
    }
  }

  if (!importPath) return;

  // Extract last segment after dot
  const lastSegment = importPath.split(".").pop() ?? importPath;
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
  wasmFile: "tree-sitter-c_sharp.wasm",
  classTypes: new Set(["class_declaration", "interface_declaration"]),
  functionTypes: new Set(["method_declaration"]),
  importTypes: new Set(["using_directive"]),
  callTypes: new Set(["invocation_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["declaration_list"],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["member_access_expression"]),
  callAccessorField: "name",
  functionBoundaryTypes: new Set(["method_declaration"]),
  importHandler: csharpImportHandler,
};
