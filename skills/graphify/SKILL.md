---
name: graphify
description: "Build and query a code navigation graph for the current project. Extracts AST structure (classes, functions, imports, calls) from 12 languages via tree-sitter WASM. Use when exploring unfamiliar code, before searching, or after editing files. Trigger: /graphify"
---

# graphify — Code Navigation Layer

A structural index of the codebase. Extracts AST structure from 12 languages via tree-sitter, builds a queryable knowledge graph, and keeps it in sync as you edit code.

## Setup (one-time)

Before first use, install dependencies in the skill directory:

```bash
cd <skill_dir> && bun install
```

This downloads tree-sitter WASM grammars (~30MB). Only needed once.

## Commands

### `/graphify` or `/graphify build`

Build a full index of the current directory.

```bash
cd <skill_dir> && bun run src/index.ts build <project_dir>
```

1. Scans all supported source files (Python, JS/TS, Go, Rust, Java, C/C++, Ruby, C#, Kotlin, Scala, PHP)
2. Extracts AST structure: classes, functions, imports, call graph, inheritance
3. Saves graph to `graphify-out/graph.json`

After building, report: "Indexed {files} files, {nodes} symbols, {edges} relationships"

### `/graphify query <question>`

Search the graph for symbols matching the question.

1. Load `graphify-out/graph.json`
2. Use `findSymbol()` for name lookup, `callersOf()`/`calleesOf()` for call graph, `fileSymbols()` for file contents, `shortestPath()` for connections
3. Return matching symbols with file locations

### `/graphify update <file1> [file2...]`

Incrementally update the graph after editing files.

1. Load existing `graphify-out/graph.json`
2. Re-extract only the specified files
3. Merge changes back into the graph
4. Report diff: "Added N nodes, removed M nodes"

### `/graphify label`

Assign semantic domain labels to code symbols. Analyze each symbol's name, context, and neighbors to assign labels like "authentication", "database", "api".

You (the agent) are the labeler — no external API calls needed.

## Supported Languages

Python, JavaScript, TypeScript (JSX/TSX), Go, Rust, Java, C, C++, Ruby, C#, Kotlin, Scala, PHP

## How to Use This

### Before searching code

If `graphify-out/graph.json` exists, check it before running Glob or Grep. The graph tells you which files contain which symbols, saving blind keyword searches.

### After editing code

When you finish editing files, run `/graphify update <changed-files>` to keep the navigation layer current.

### Exploring unfamiliar code

Use `/graphify query <concept>` to find entry points. Use `callersOf` to trace who uses a function. Use `shortestPath` to understand how two modules connect.

## Graph Schema

```json
{
  "nodes": [
    { "id": "file::main", "label": "main.py", "fileType": "code", "sourceFile": "main.py", "sourceLocation": "main.py:1" },
    { "id": "main::app", "label": "App", "fileType": "code", "sourceFile": "main.py", "sourceLocation": "main.py:5" }
  ],
  "edges": [
    { "source": "file::main", "target": "main::app", "relation": "contains", "confidence": "EXTRACTED" }
  ],
  "metadata": { "files": 10, "nodes": 45, "edges": 62, "builtAt": "2026-04-09T..." }
}
```

### Edge Relations

| Relation | Confidence | Meaning |
|----------|-----------|---------|
| `contains` | EXTRACTED | File contains a class/function |
| `method` | EXTRACTED | Class contains a method |
| `imports` | EXTRACTED | File imports a module |
| `imports_from` | EXTRACTED | File imports names from a module |
| `inherits` | EXTRACTED | Class inherits from another |
| `calls` | INFERRED | Function calls another function |
