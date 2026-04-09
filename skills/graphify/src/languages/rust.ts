import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Rust use declarations:
 * - `use std::collections::HashMap;` -> imports edge to "hashmap"
 * - `use std::io;` -> imports edge to "io"
 */
function rustImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Recursively find the last identifier in the use path
  function findLastSegment(n: Parser.SyntaxNode): string | null {
    // use_list: `use std::{io, fs}` - handle multiple
    if (n.type === "use_list") {
      for (const child of n.namedChildren) {
        const seg = findLastSegment(child);
        if (seg) {
          edges.push({
            source: fileNid,
            target: `mod::${seg.toLowerCase()}`,
            relation: "imports",
            confidence: "EXTRACTED",
            sourceFile: filePath,
            sourceLocation: loc,
            weight: 1.0,
          });
        }
      }
      return null;
    }

    if (n.type === "scoped_identifier") {
      const nameNode = n.childForFieldName("name");
      if (nameNode) return nameNode.text;
      // Last named child as fallback
      const last = n.lastNamedChild;
      return last?.text ?? null;
    }

    if (n.type === "identifier" || n.type === "type_identifier") {
      return n.text;
    }

    // Recurse for other node types (use_wildcard, scoped_use_list, etc.)
    for (const child of n.namedChildren) {
      const seg = findLastSegment(child);
      if (seg) return seg;
    }
    return null;
  }

  // Find the path child of use_declaration
  const pathChild = node.namedChildren[0];
  if (!pathChild) return;

  if (pathChild.type === "use_list") {
    // Already handled recursively
    findLastSegment(pathChild);
    return;
  }

  const seg = findLastSegment(pathChild);
  if (seg) {
    edges.push({
      source: fileNid,
      target: `mod::${seg.toLowerCase()}`,
      relation: "imports",
      confidence: "EXTRACTED",
      sourceFile: filePath,
      sourceLocation: loc,
      weight: 1.0,
    });
  }
}

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-rust.wasm",
  classTypes: new Set(["struct_item", "enum_item", "trait_item"]),
  functionTypes: new Set(["function_item"]),
  importTypes: new Set(["use_declaration"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier", "type_identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: [],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["field_expression", "scoped_identifier"]),
  callAccessorField: "field",
  functionBoundaryTypes: new Set(["function_item"]),
  importHandler: rustImportHandler,
};
