import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A glob that matches nothing is {} at build time and a blank on the page, never an error.
const CHILD = fileURLToPath(new URL("../..", import.meta.url));
const EXT = new Set([".svelte", ".ts"]);

function sources(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name === "assets" || e.name.startsWith(".")) continue;
		const full = join(dir, e.name);
		if (e.isDirectory()) sources(full, out);
		else if (EXT.has(extname(e.name)) && !/\.test\.ts$/.test(e.name)) out.push(full);
	}
	return out;
}

const GLOB = /import\.meta\.glob(?:<[^>]*>)?\(\s*["'](\.{1,2}\/[^"']+)["']/g;

function matches(pattern: string, from: string): number {
	const dir = resolve(dirname(from), dirname(pattern));
	const name = pattern.slice(pattern.lastIndexOf("/") + 1);
	const re = new RegExp(`^${name.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
	try {
		return readdirSync(dir).filter((f) => re.test(f)).length;
	} catch {
		return 0;
	}
}

describe("every import.meta.glob in the child matches at least one file", () => {
	it("finds its files where the importing file now lives", () => {
		const empty: string[] = [];
		for (const file of sources(CHILD)) {
			for (const m of readFileSync(file, "utf8").matchAll(GLOB)) {
				if (matches(m[1], file) === 0) empty.push(`${file.slice(CHILD.length)}: ${m[1]}`);
			}
		}
		expect(empty, `globs that match nothing:\n  ${empty.join("\n  ")}`).toEqual([]);
	});
});
