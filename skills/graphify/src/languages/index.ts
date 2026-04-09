import type { LanguageConfig } from "./types";

const configRegistry = new Map<string, () => Promise<LanguageConfig>>();

const extensionMap = new Map<string, string>([
  [".py", "python"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".go", "go"],
  [".rs", "rust"],
  [".java", "java"],
  [".c", "c"],
  [".h", "c"],
  [".cpp", "cpp"],
  [".cc", "cpp"],
  [".cxx", "cpp"],
  [".hpp", "cpp"],
  [".rb", "ruby"],
  [".cs", "csharp"],
  [".kt", "kotlin"],
  [".kts", "kotlin"],
  [".scala", "scala"],
  [".php", "php"],
]);

export function registerLanguage(
  key: string,
  loader: () => Promise<LanguageConfig>,
): void {
  configRegistry.set(key, loader);
}

export function getLanguageKey(ext: string): string | null {
  return extensionMap.get(ext.toLowerCase()) ?? null;
}

export async function getLanguageConfig(
  key: string,
): Promise<LanguageConfig | null> {
  const loader = configRegistry.get(key);
  if (!loader) return null;
  return loader();
}

export function supportedExtensions(): string[] {
  return [...extensionMap.keys()];
}

// Register languages
registerLanguage("python", () => import("./python").then((m) => m.config));
registerLanguage("javascript", () => import("./javascript").then((m) => m.config));
registerLanguage("typescript", () => import("./javascript").then((m) => m.tsConfig));
registerLanguage("go", () => import("./go").then((m) => m.config));
registerLanguage("rust", () => import("./rust").then((m) => m.config));
registerLanguage("java", () => import("./java").then((m) => m.config));
registerLanguage("c", () => import("./c").then((m) => m.cConfig));
registerLanguage("cpp", () => import("./c").then((m) => m.cppConfig));
registerLanguage("ruby", () => import("./ruby").then((m) => m.config));
registerLanguage("csharp", () => import("./csharp").then((m) => m.config));
registerLanguage("kotlin", () => import("./kotlin").then((m) => m.config));
registerLanguage("scala", () => import("./scala").then((m) => m.config));
registerLanguage("php", () => import("./php").then((m) => m.config));

export type {
  LanguageConfig,
  NodeDict,
  EdgeDict,
  ExtractionResult,
} from "./types";
