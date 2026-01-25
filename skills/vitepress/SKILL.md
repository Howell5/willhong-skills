---
name: vitepress-tutorial
description: Generate VitePress documentation sites for source code learning and analysis. Use when creating tutorials that explain how a codebase is implemented internally.
---

# VitePress Source Tutorial Generator

Generate VitePress documentation sites for source code learning and analysis.

## Overview

This skill creates standalone VitePress tutorial sites that teach developers how a codebase works internally. Unlike user documentation that explains "how to use", these tutorials explain "how it's implemented".

## Usage

```
/vitepress-tutorial [task-description]
```

**Examples:**
- `/vitepress-tutorial 帮我解析这个仓库的架构`
- `/vitepress-tutorial explain the agent system in detail`

## Workflow

### Phase 1: Project Analysis & Setup (REQUIRED FIRST)

1. **Detect project type** - Identify language, framework, monorepo structure
2. **Ask user for output location** - Use AskUserQuestion tool to confirm:
   - Output directory path (suggest reasonable default based on project structure)
   - Tutorial focus areas (if not specified in the task)
3. **Create project skeleton immediately** - After user confirms location:
   - Create directory structure
   - Write `package.json` with Mermaid plugin
   - Write `.vitepress/config.ts`
   - Write `pnpm-workspace.yaml` (if inside another workspace)
   - Run `pnpm install`

### Phase 2: Deep Analysis

1. Explore source directory using Task tool with Explore agent
2. Identify key components, patterns, and architecture
3. Map dependencies and data flows
4. Build mental model of module interactions

### Phase 3: Content Generation

1. Generate all documentation files based on analysis
2. Include Mermaid diagrams for architecture visualization
3. Reference actual source code with file:line annotations
4. Build and verify the site works

## CRITICAL INSTRUCTIONS

### Ask Before Writing

**ALWAYS use AskUserQuestion to confirm output location before creating any files:**

```
Question: "Where should I create the VitePress tutorial site?"
Options:
- "./docs" (project docs folder)
- "./tutorials/{project-name}" (dedicated tutorials folder)
- Custom path...
```

### Standalone Project Setup

When creating inside an existing pnpm workspace, ALWAYS create these files to make it independent:

**pnpm-workspace.yaml** (in tutorial root):
```yaml
# Independent workspace - prevents inheriting parent config
packages: []
```

**package.json** (MUST include):
```json
{
  "name": "{tutorial-name}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vitepress dev docs",
    "build": "vitepress build docs",
    "preview": "vitepress preview docs"
  },
  "devDependencies": {
    "mermaid": "^11.4.0",
    "vitepress": "^1.6.3",
    "vitepress-plugin-mermaid": "^2.0.17"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

### Config with Mermaid

**docs/.vitepress/config.ts** (MUST use withMermaid wrapper):
```typescript
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  // CRITICAL: Fix Mermaid's dayjs ESM compatibility issue
  vite: {
    optimizeDeps: {
      include: ['mermaid', 'dayjs']
    }
  },
  // ... rest of config
  mermaid: {
    theme: 'default'
  }
}))
```

**Why `vite.optimizeDeps`?** Mermaid depends on dayjs which is a CommonJS module. Without this config, Vite dev server will throw "does not provide an export named 'default'" error.

### Install Dependencies

After creating project files, ALWAYS run:
```bash
cd {output-path} && pnpm install
```

## Output Structure

```
{output-path}/
├── package.json              # With mermaid plugin
├── pnpm-workspace.yaml       # If inside another workspace
├── README.md
└── docs/
    ├── .vitepress/
    │   └── config.ts         # With withMermaid wrapper
    ├── index.md              # Homepage
    ├── introduction/
    │   ├── overview.md       # Project overview
    │   └── architecture.md   # Architecture diagram
    └── {modules}/            # One directory per module
        ├── index.md
        └── {topics}.md
```

## Features

- **Mermaid Diagrams**: Architecture, sequence, and flow diagrams (auto-installed)
- **Source References**: Auto-generate `Source: path/to/file.go:123` annotations
- **Code Highlighting**: Go, TypeScript, Python with line highlighting
- **Chinese-first**: Content in Chinese, code comments in English
- **Standalone Deploy**: Ready for Vercel, Netlify, or GitHub Pages

## Content Guidelines

1. **Always explore first** - Read source files before writing tutorials
2. **Reference actual code** - Include real code snippets with file paths
3. **Use Mermaid for architecture** - Visual diagrams aid understanding
4. **Keep chapters focused** - One concept per file, ~200-400 lines
5. **Link between chapters** - Use VitePress prev/next navigation
6. **Include API tables** - Summarize endpoints, functions, types

## Supporting Files

- @config-template.md - VitePress configuration template
- @project-structure.md - Project structure and file templates
- @content-guidelines.md - Content writing guidelines
