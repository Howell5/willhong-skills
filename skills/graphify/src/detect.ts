import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

export enum FileType {
  Code = "code",
  Document = "document",
  Paper = "paper",
  Image = "image",
}

const CODE_EXTENSIONS = new Set([
  ".py", ".ts", ".js", ".jsx", ".tsx", ".go", ".rs", ".java",
  ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp",
  ".rb", ".cs", ".kt", ".kts", ".scala", ".php",
]);

const DOC_EXTENSIONS = new Set([".md", ".txt", ".rst"]);
const PAPER_EXTENSIONS = new Set([".pdf"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

const SENSITIVE_PATTERNS = [
  /(?:^|[\\/])\.(?:env|envrc)(?:\.|$)/i,
  /\.(?:pem|key|p12|pfx|cert|crt|der|p8)$/i,
  /(?:credential|secret|passwd|password|token|private_key)/i,
  /(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.pub)?$/,
  /(?:\.netrc|\.pgpass|\.htpasswd)$/i,
  /(?:aws_credentials|gcloud_credentials|service.account)/i,
];

function isSensitive(filename: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(filename));
}

export function classifyFile(filename: string): FileType | null {
  if (isSensitive(filename)) return null;
  const ext = extname(filename).toLowerCase();
  if (CODE_EXTENSIONS.has(ext)) return FileType.Code;
  if (DOC_EXTENSIONS.has(ext)) return FileType.Document;
  if (PAPER_EXTENSIONS.has(ext)) return FileType.Paper;
  if (IMAGE_EXTENSIONS.has(ext)) return FileType.Image;
  return null;
}

export interface CollectedFile {
  path: string;
  type: FileType;
}

export async function collectFiles(dir: string): Promise<CollectedFile[]> {
  const results: CollectedFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const type = classifyFile(entry.name);
        if (type !== null) {
          results.push({ path: fullPath, type });
        }
      }
    }
  }

  await walk(dir);
  return results;
}
