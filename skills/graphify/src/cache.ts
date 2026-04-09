import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, unlink, rename } from "node:fs/promises";
import { join, resolve } from "node:path";

export async function fileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const resolved = resolve(filePath);
  const h = createHash("sha256");
  h.update(content);
  h.update("\0");
  h.update(resolved);
  return h.digest("hex");
}

function cacheDir(root: string): string {
  return join(root, "graphify-out", "cache");
}

async function ensureCacheDir(root: string): Promise<string> {
  const dir = cacheDir(root);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function loadCached(filePath: string, root: string = "."): Promise<Record<string, unknown> | null> {
  try {
    const h = await fileHash(filePath);
    const entryPath = join(cacheDir(root), `${h}.json`);
    const content = await readFile(entryPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function saveCached(filePath: string, result: Record<string, unknown>, root: string = "."): Promise<void> {
  const dir = await ensureCacheDir(root);
  const h = await fileHash(filePath);
  const entryPath = join(dir, `${h}.json`);
  const tmpPath = `${entryPath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(result));
  await rename(tmpPath, entryPath);
}

export async function clearCache(root: string = "."): Promise<void> {
  const dir = cacheDir(root);
  try {
    const entries = await readdir(dir);
    await Promise.all(
      entries
        .filter((e) => e.endsWith(".json"))
        .map((e) => unlink(join(dir, e)))
    );
  } catch {
    // Cache dir doesn't exist — nothing to clear
  }
}
