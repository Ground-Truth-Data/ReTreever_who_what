// ⚠️ A child must never hardcode a parent's name (ReTreever, rapper, vercel) as a path segment, import, or URL host — only by package name (@ground-truth/<child>/...)... is allowed. Side-by-side on one machine it resolves; published standalone it doesn't, which is the point of a child folder.
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CHILD = fileURLToPath(new URL("..", import.meta.url));
const EXT = new Set([".svelte", ".ts", ".js", ".css", ".json"]);

// Test files (*.test.*) are excluded from the scan — the contract/lockstep tests deliberately name a parent and skip when it's absent.
const isTest = (name: string) => /\.test\.[^.]+$/.test(name);

function sources(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name === "assets") continue;
		if (e.name.startsWith(".")) continue;
		const full = join(dir, e.name);
		if (e.isDirectory()) sources(full, out);
		else if (EXT.has(extname(e.name)) && !isTest(e.name)) out.push(full);
	}
	return out;
}

// PARENT_AS_LOCATION matches a parent named as a PLACE — a path segment, import, or URL host — anchored so it won't fire on this child's own folder name or on comment prose.
// BRAND_STRING exempts Symbol.for(...) registry keys (e.g. "retreever.safeMarker.installed") — namespaced identifiers, not paths, so they don't false-positive as a parent name.
const BRAND_STRING = /Symbol\.for\(/;

// ⚠️ Must also match a parent name at the END of a string (e.g. href="{GH}/rapper"), not just mid-path — an earlier version required a trailing / or . and silently missed every terminal case.
const PARENT_AS_LOCATION =
	/(?:\.\.?\/|["'`({]\/?|\}\/|https?:\/\/[^"'`\s]*)(?:ReTreever|rapper|vercel)(?:[/.]|["'`)\s<]|$)/gi;

describe("the child names no parent", () => {
	it("no path, import or URL names ReTreever, rapper or vercel", () => {
		const offenders: string[] = [];

		for (const file of sources(CHILD)) {
			const text = readFileSync(file, "utf8");
			// Joined over two lines so a Symbol.for(...) call that wraps is still recognised.
			const lines = text.split("\n");
			// Block comments span lines, so inBlockComment state is tracked across lines instead of checking each line alone.
			let inBlockComment = false;
			for (const [i, line] of lines.entries()) {
				const stmt = `${lines[i - 1] ?? ""}\n${line}`;
				const t = line.trim();
				const wasInComment = inBlockComment;
				// Opens/closes counted per line, so a one-line /* */ doesn't open a block, and a closing line is still skipped.
				const opens = (line.match(/\/\*/g) ?? []).length;
				const closes = (line.match(/\*\//g) ?? []).length;
				if (opens > closes) inBlockComment = true;
				else if (closes > opens) inBlockComment = false;

				if (wasInComment || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) {
					continue; // documentation, not a dependency
				}
				if (BRAND_STRING.test(stmt)) continue;
				for (const m of line.matchAll(PARENT_AS_LOCATION)) {
					offenders.push(`${relative(CHILD, file)}:${i + 1}  ${m[0]}`);
				}
			}
		}

		expect(
			offenders,
			`These name a PARENT as a location:\n\n` +
				offenders.map((o) => `  ${o}`).join("\n") +
				`\n\nA child has two possible parents and must run under either, so ` +
				`naming one is a defect even when the path resolves — and side by ` +
				`side on one machine, it DOES resolve. It stops resolving the ` +
				`moment this folder is published on its own, which is the point ` +
				`of the folder.\n\n` +
				`Import a sibling by its package name (@ground-truth/<child>/...), or take what you ` +
				`need as a prop. Never by name.`,
		).toEqual([]);
	});

	it("the check bites — a parent-named path is detected", () => {
		// Without this, a broken regex silently passes everything above.
		const ok = 'import x from "@ground-truth/getcache-onlinemap/lib/foo";';
		expect([...ok.matchAll(PARENT_AS_LOCATION)].length).toBe(0);

		// Both shapes matter — losing either the mid-path or terminal case re-opens the hole the regex used to have.
		const bad = [
			'import x from "../ReTreever/src/lib/foo";', // mid-path
			'href="{GH}/rapper"', // terminal, in a string
			'"https://github.com/Ground-Truth-Data/rapper"', // terminal, full URL
		];
		for (const b of bad) {
			expect(
				[...b.matchAll(PARENT_AS_LOCATION)].length,
				`should have been flagged: ${b}`,
			).toBeGreaterThan(0);
		}
	});
});
