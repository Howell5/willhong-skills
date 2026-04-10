---
name: graphify
description: "Use when exploring unfamiliar codebases, before searching for code, or after editing files. Builds a structural AST index (classes, functions, imports, call graph) from 12 languages via tree-sitter. Trigger: /graphify"
allowed-tools: Bash(graphify:*)
---

# graphify — Code Navigation Layer

Structural index of the codebase. Know what exists, where, and how it connects — before you grep.

**Requires CLI:** `npm i -g graphify-ts` (uses Bun runtime).

**Auto-update recommended:** Run `graphify hook install` once. After that, the graph updates automatically at the end of every Claude Code session via a Stop hook — the agent never needs to remember.

## First-time setup (one-time per machine)

```bash
npm i -g graphify-ts    # install CLI
graphify hook install   # install Stop hook for auto-update
```

Then, once per project:

```bash
graphify build .
```

After that, the graph stays in sync automatically. The agent just needs to query it.

## Commands

### `/graphify build` — Build index (first time only)

```bash
graphify build .
```

Scans all source files, extracts AST structure, saves to `graphify-out/graph.json`.

Report: "Indexed {files} files, {nodes} symbols, {edges} relationships"

### `/graphify query <name>` — Search for symbols

```bash
graphify query graphify-out/graph.json <name>
```

Case-insensitive search. Returns matching symbols with file locations.

### `/graphify update <files...>` — Manual incremental update

```bash
graphify update graphify-out/graph.json <file1> [file2...]
```

Re-extract only the specified files. **You usually don't need this** — the Stop hook handles updates automatically. Use this only when the hook isn't installed or you want to force a sync mid-session.

### `/graphify auto-update` — Auto-update (hook internal)

```bash
graphify auto-update [dir]
```

Computes changed code files via `git diff` + untracked files, then calls `updateIndex`. Silent when there's nothing to do. **This is what the Stop hook runs — you don't call it directly.**

### `/graphify hook install | uninstall | status` — Manage the Stop hook

```bash
graphify hook install    # enable auto-update at session end
graphify hook uninstall  # disable
graphify hook status     # check current state
```

The hook writes to `~/.claude/settings.json`, preserving all existing config.

## When to Use

**Before searching code:** If `graphify-out/graph.json` exists, query it before Glob or Grep. The graph tells you which files contain which symbols. This is the main value — replace blind keyword search with structured lookup.

**You do NOT need to manually update after editing.** The Stop hook handles it. Just do your work — the graph will be current next time you query it.

**Exploring unfamiliar code:** Run `/graphify query <concept>` to find entry points without guessing filenames.

## Supported Languages

Python, JavaScript, TypeScript (JSX/TSX), Go, Rust, Java, C, C++, Ruby, C#, Kotlin, Scala, PHP

## Graph Output

Saved as `graphify-out/graph.json`:

```json
{
  "nodes": [{ "id": "main::app", "label": "App", "sourceFile": "main.py", "sourceLocation": "main.py:5" }],
  "edges": [{ "source": "file::main", "target": "main::app", "relation": "contains", "confidence": "EXTRACTED" }],
  "metadata": { "files": 10, "nodes": 45, "edges": 62 }
}
```

Edge relations: `contains`, `method`, `imports`, `imports_from`, `calls` (INFERRED), `inherits`
