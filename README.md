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
| [social-polish](#social-polish) | 从核心观点生成优质社媒长文，运用 4D 框架分析，去 AI 味，6 维度评审 |

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

## License

MIT
