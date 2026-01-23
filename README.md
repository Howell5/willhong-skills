# willhong-skills

Skills shared by Will Hong for Claude Code and other AI agents.

## Installation

```bash
npx skills add Howell5/willhong-skills
```

## Available Skills

| Skill | Description |
|-------|-------------|
| [vitepress-tutorial](#vitepress-tutorial) | Generate VitePress documentation sites for source code learning |

---

### vitepress-tutorial

Generate VitePress documentation sites for source code learning and analysis. Unlike user documentation that explains "how to use", these tutorials explain "how it's implemented".

```bash
/vitepress-tutorial [source-path] [output-path]
```

**Examples:**

```bash
/vitepress-tutorial ./apps/runner ./tutorials/runner-guide
/vitepress-tutorial ./pkg/sandbox
```

**Features:**

- Source References: Auto-generate `Source: path/to/file.go:123` annotations
- Mermaid Diagrams: Architecture, sequence, and flow diagrams
- Code Highlighting: Go, TypeScript, Python with line highlighting
- Chinese-first: Content in Chinese, code comments in English
- Standalone Deploy: Ready for Vercel, Netlify, or GitHub Pages

**Workflow:**

1. **Analysis** - Explore source directory, identify components and architecture
2. **Planning** - Generate tutorial outline and chapter structure
3. **Generation** - Create VitePress project with tutorial content

**Output Structure:**

```
{output-path}/
├── package.json
├── docs/
│   ├── .vitepress/
│   │   └── config.ts
│   ├── index.md
│   ├── introduction/
│   │   ├── overview.md
│   │   └── architecture.md
│   └── {modules}/
│       ├── index.md
│       └── {topics}.md
└── README.md
```

## License

MIT
