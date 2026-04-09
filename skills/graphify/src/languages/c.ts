import type Parser from "web-tree-sitter";
import type {
  LanguageConfig,
  EdgeDict,
  ResolveFunctionNameFn,
  ExtraWalkHandler,
} from "./types";

/**
 * Handle C/C++ preprocessor include directives:
 * - `#include <stdio.h>` -> imports edge to "stdio"
 * - `#include "myheader.h"` -> imports edge to "myheader"
 */
function cIncludeHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  // Find string_literal or system_lib_string child
  const pathNode = node.namedChildren.find(
    (c) =>
      c.type === "string_literal" ||
      c.type === "system_lib_string" ||
      c.type === "string_content",
  );

  if (!pathNode) return;

  // Strip quotes and angle brackets: <stdio.h> or "myheader.h"
  const raw = pathNode.text
    .replace(/^[<"']|[>"']$/g, "")
    .trim();

  // Extract filename without extension
  const fileName = raw.split("/").pop() ?? raw;
  const moduleName = fileName.replace(/\.\w+$/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_");

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

/**
 * Recursively unwrap C/C++ declarator nodes to find the innermost identifier.
 * C function names are nested in declarator trees like:
 *   function_definition
 *     declarator: function_declarator
 *       declarator: identifier  <- the actual name
 */
function unwrapDeclarator(node: Parser.SyntaxNode): string | null {
  if (node.type === "identifier" || node.type === "field_identifier") return node.text;

  // Try the declarator field first (function_declarator, pointer_declarator, etc.)
  const inner = node.childForFieldName("declarator");
  if (inner) {
    const result = unwrapDeclarator(inner);
    if (result) return result;
  }

  // Walk named children looking for identifier
  for (const child of node.namedChildren) {
    if (child.type === "identifier" || child.type === "field_identifier") return child.text;
    if (
      child.type === "function_declarator" ||
      child.type === "pointer_declarator" ||
      child.type === "reference_declarator" ||
      child.type === "abstract_declarator"
    ) {
      const result = unwrapDeclarator(child);
      if (result) return result;
    }
  }

  return null;
}

/**
 * ExtraWalkHandler for C/C++: handles function_definition nodes to extract the
 * proper function name by unwrapping the declarator.
 */
const cFunctionWalkHandler: ExtraWalkHandler = (
  node,
  _source,
  fileNid,
  stem,
  filePath,
  _nodes,
  _edges,
  _seenIds,
  functionBodies,
  parentClassNid,
  addNode,
  addEdge,
): boolean => {
  if (node.type !== "function_definition") return false;

  const line = node.startPosition.row + 1;

  // Get the declarator to find the function name
  const declNode = node.childForFieldName("declarator");
  if (!declNode) return false;

  const funcName = unwrapDeclarator(declNode);
  if (!funcName) return false;

  const funcNid = parentClassNid
    ? `${parentClassNid}::${funcName.toLowerCase()}`
    : `${stem}::${funcName.toLowerCase()}`;
  const label = parentClassNid ? `.${funcName}` : funcName;

  addNode(funcNid, label, line);

  if (parentClassNid) {
    addEdge(parentClassNid, funcNid, "method", line);
  } else {
    addEdge(fileNid, funcNid, "contains", line);
  }

  // Save function body for call-graph pass
  const body = node.childForFieldName("body");
  if (body) {
    functionBodies.push([funcNid, body]);
  }

  return true;
};

const cResolveName: ResolveFunctionNameFn = (node, _source) => {
  // For call_expression, the function field may be a simple identifier
  // or a field_expression for obj->method() or obj.method()
  const funcNode = node.childForFieldName("function");
  if (!funcNode) return null;

  if (funcNode.type === "identifier") return funcNode.text;

  // obj->method or obj.method
  if (funcNode.type === "field_expression") {
    const fieldNode = funcNode.childForFieldName("field");
    if (fieldNode) return fieldNode.text;
    return funcNode.lastNamedChild?.text ?? null;
  }

  return funcNode.text || null;
};

const cppResolveName: ResolveFunctionNameFn = (node, _source) => {
  const funcNode = node.childForFieldName("function");
  if (!funcNode) return null;

  if (funcNode.type === "identifier") return funcNode.text;

  if (funcNode.type === "field_expression") {
    const fieldNode = funcNode.childForFieldName("field");
    if (fieldNode) return fieldNode.text;
    return funcNode.lastNamedChild?.text ?? null;
  }

  // C++: Namespace::function -> extract last segment
  if (funcNode.type === "qualified_identifier") {
    const nameNode = funcNode.childForFieldName("name");
    if (nameNode) return nameNode.text;
    return funcNode.lastNamedChild?.text ?? null;
  }

  return funcNode.text || null;
};

/**
 * C language config.
 * C functions use `declarator` field for the name (not `name`).
 * We use an ExtraWalkHandler to properly unwrap declarators for function names.
 */
export const cConfig: LanguageConfig = {
  wasmFile: "tree-sitter-c.wasm",
  classTypes: new Set([]),
  functionTypes: new Set([]), // Handled by extraWalkFn instead
  importTypes: new Set(["preproc_include"]),
  callTypes: new Set(["call_expression"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier", "type_identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: [],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["field_expression"]),
  callAccessorField: "field",
  functionBoundaryTypes: new Set(["function_definition"]),
  resolveFunctionNameFn: cResolveName,
  importHandler: cIncludeHandler,
  extraWalkFn: cFunctionWalkHandler,
};

/**
 * C++ language config — extends C with class support and namespace-aware call resolution.
 * C++ classes use `class_specifier` with `name` field and `field_declaration_list` body.
 */
export const cppConfig: LanguageConfig = {
  ...cConfig,
  wasmFile: "tree-sitter-cpp.wasm",
  classTypes: new Set(["class_specifier", "struct_specifier"]),
  nameField: "name",
  nameFallbackChildTypes: ["type_identifier", "identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["field_declaration_list"],
  callAccessorNodeTypes: new Set(["field_expression", "qualified_identifier"]),
  resolveFunctionNameFn: cppResolveName,
  functionBoundaryTypes: new Set(["function_definition"]),
};
