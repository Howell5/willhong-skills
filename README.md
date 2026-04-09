# willhong-skills

Skills shared by Will Hong for Claude Code and other AI agents.

## Installation

```bash
npx skills add Howell5/willhong-skills
```

## Available Skills

| Skill | Description |
|-------|-------------|
| [graphify](#graphify) | Code navigation layer for AI agents — AST extraction from 12 languages, queryable knowledge graph |
| [vitepress-tutorial](#vitepress-tutorial) | Generate VitePress documentation sites for source code learning |
| [social-polish](#social-polish) | 从核心观点生成优质社媒长文，运用 4D 框架分析，去 AI 味，6 维度评审 |
| [frontend-i18n-orchestrator](#frontend-i18n-orchestrator) | Frontend 项目 i18n 全链路编排：自动探测、最少提问、分阶段改造与质量门禁 |

---

### graphify

Code navigation layer for AI coding agents. Extracts AST structure from 12 programming languages via tree-sitter WASM, builds a queryable knowledge graph, and keeps it in sync as code changes.

```bash
/graphify build         # index the current project
/graphify query <name>  # find symbols by name
/graphify update <file> # re-index after editing
```

**Features:**

- 12 languages: Python, JS/TS, Go, Rust, Java, C/C++, Ruby, C#, Kotlin, Scala, PHP
- Deterministic AST extraction via tree-sitter WASM — no LLM needed for structure
- Incremental updates — only re-extracts changed files
- Call graph, inheritance, import relationships
- Optional semantic labeling (agent-driven, no API key)

**Setup:** Requires `bun` runtime. Run `bun install` in the skill directory on first use.

**Source:** [github.com/Howell5/graphify-ts](https://github.com/Howell5/graphify-ts)

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

---

### social-polish

从核心观点生成可直接发布的优质社媒长文。通过 4D 框架深度分析、去 AI 味处理、6 维度评审，确保输出的内容观点鲜明、情感共鸣、语言自然。

```bash
/social-polish [你的核心观点或选题]
```

**示例：**

```bash
/social-polish 为什么大多数人学不会编程
/social-polish 远程工作三年后我发现的真相
/social-polish 年轻人为什么越来越不想结婚
```

**特性：**

- 4D 框架分析：哲学、心理学、传播学、社会学四维度拆解选题
- 去 AI 味处理：删除空洞过渡词、模板化开头、说教式结尾
- 6 维度评审：观点独特性、情感共鸣度、结构清晰度、语言自然度、信息密度、传播潜力
- 自动迭代：低于 54/60 分自动修订，最多 3 轮

**适用平台：** X 长推、小红书图文、微信公众号、即刻等

---

### frontend-i18n-orchestrator

面向 React/Vue/Next/Nuxt/Vite 的项目级 i18n 改造 skill。默认先自动扫描项目，再只询问无法自动推断的业务决策，最后分阶段完成迁移与验证。

```bash
/frontend-i18n-orchestrator
```

**特性：**

- Auto-first：先探测框架、现有 i18n 状态、文案热点，再提问
- Ask-on-ambiguity：仅在业务策略不明确时提问（目标语言、URL 策略、fallback 等）
- 分阶段执行：基建 -> 文案迁移 -> 本地化格式 -> 路由/SEO -> CI 治理
- 质量门禁：缺 key、孤儿 key、硬编码回归检查
- Claude Code 与 Codex 双端兼容

## License

MIT
