import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const SOURCE_ROOT = join(__dirname, "..");

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name === "__tests__") return [];
    if (entry.isDirectory()) return collectTsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

describe("Deno import compatibility", () => {
  it("uses .ts extensions for shared source relative imports and re-exports", () => {
    const offenders = collectTsFiles(SOURCE_ROOT).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const matches = source.matchAll(
        /\b(?:import|export)\b[\s\S]*?\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g
      );

      return Array.from(matches).flatMap((match) => {
        const specifier = match[1];
        if (!specifier || specifier.endsWith(".ts")) return [];
        return [`${relative(SOURCE_ROOT, file)} -> ${specifier}`];
      });
    });

    expect(offenders).toEqual([]);
  });
});
