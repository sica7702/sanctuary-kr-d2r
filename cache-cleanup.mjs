import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TARGETS = ["__pycache__", ".pytest_cache", ".mypy_cache"];

export async function cleanupRuntimeCaches() {
  const now = Date.now();

  for (const target of TARGETS) {
    const fullPath = path.join(ROOT, target);

    try {
      const stat = await fs.stat(fullPath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        await fs.rm(fullPath, { recursive: true, force: true });
      }
    } catch {
      // 캐시가 없으면 정상적으로 무시
    }
  }
}
