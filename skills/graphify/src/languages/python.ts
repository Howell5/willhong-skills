import type Parser from "web-tree-sitter";
import type { LanguageConfig, EdgeDict } from "./types";

/**
 * Handle Python import statements:
 * - `import os` -> imports edge
 * - `from pathlib import Path` -> imports_from edge
 */
function pythonImportHandler(
  node: Parser.SyntaxNode,
  _source: string,
  fileNid: string,
  _stem: string,
  edges: EdgeDict[],
  filePath: string,
): void {
  const line = node.startPosition.row + 1;
  const loc = `${filePath}:${line}`;

  if (node.type === "import_statement") {
    // `import os` or `import os, sys`
    for (const child of node.namedChildren) {
      if (
        child.type === "dotted_name" ||
        child.type === "aliased_import"
      ) {
        const moduleName =
          child.type === "aliased_import"
            ? child.childForFieldName("name")?.text ?? child.text
            : child.text;
        const targetNid = `mod::${moduleName.toLowerCase().replace(/\./g, "_")}`;
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
    }
  } else if (node.type === "import_from_statement") {
    // `from pathlib import Path`
    const moduleNode = node.childForFieldName("module_name");
    const moduleName = moduleNode?.text ?? "";

    // Collect imported names using the "name" field
    // (excludes module_name which uses a different field)
    const nameNodes = node.childrenForFieldName("name");
    for (const child of nameNodes) {
      const importedName =
        child.type === "aliased_import"
          ? child.childForFieldName("name")?.text ?? child.text
          : child.text;
      const targetNid = `mod::${moduleName.toLowerCase().replace(/\./g, "_")}::${importedName.toLowerCase()}`;
      edges.push({
        source: fileNid,
        target: targetNid,
        relation: "imports_from",
        confidence: "EXTRACTED",
        sourceFile: filePath,
        sourceLocation: loc,
        weight: 1.0,
      });
    }
  }
}

export const config: LanguageConfig = {
  wasmFile: "tree-sitter-python.wasm",
  classTypes: new Set(["class_definition"]),
  functionTypes: new Set(["function_definition"]),
  importTypes: new Set(["import_statement", "import_from_statement"]),
  callTypes: new Set(["call"]),
  nameField: "name",
  nameFallbackChildTypes: ["identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["block"],
  callFunctionField: "function",
  callAccessorNodeTypes: new Set(["attribute"]),
  callAccessorField: "attribute",
  functionBoundaryTypes: new Set(["function_definition", "class_definition"]),
  importHandler: pythonImportHandler,
};
