import type { LanguageConfig } from "./types";

/**
 * Ruby language config.
 * Ruby does not have grammar-level import nodes; `require` is a regular function call.
 * Classes use `class` node type, methods use `method` or `singleton_method`.
 */
export const config: LanguageConfig = {
  wasmFile: "tree-sitter-ruby.wasm",
  classTypes: new Set(["class"]),
  functionTypes: new Set(["method", "singleton_method"]),
  importTypes: new Set([]),
  callTypes: new Set(["call"]),
  nameField: "name",
  nameFallbackChildTypes: ["constant", "scope_resolution", "identifier"],
  bodyField: "body",
  bodyFallbackChildTypes: ["body_statement"],
  callFunctionField: "method",
  callAccessorNodeTypes: new Set([]),
  callAccessorField: "",
  functionBoundaryTypes: new Set(["method", "singleton_method", "class"]),
};
