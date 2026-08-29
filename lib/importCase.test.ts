/**
 * ⚠️ Relative import specifiers must match the filesystem's exact case — macOS's case-insensitive APFS lets a wrong-case import resolve locally and fail only on Linux/Vercel at deploy time.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CHILD = fileURLToPath(new URL("..", import.meta.url));

function sources(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name.startsWith(".")) continue;
		const full = join(dir, e.name);
		if (e.isDirectory()) sources(full, out);
		else if (/\.(svelte|ts|js|css)$/.test(e.name)) out.push(full);
	}
	return out;
}

// existsSync() can't detect case on a case-insensitive volume; read each parent directory's listing instead.
function existsWithExactCase(abs: string): boolean {
	if (!existsSync(abs)) return false;
	let cur = resolve("/");
	for (const seg of relative("/", abs).split(sep)) {
		if (!seg) continue;
		let names: string[];
		try {
			names = readdirSync(cur);
		} catch {
			return true; // unreadable parent — not this test's business
		}
		if (!names.includes(seg)) return false;
		cur = join(cur, seg);
	}
	return true;
}

/** Relative specifiers: import x from "./y", and CSS url("./y"). */
function relativeSpecifiers(text: string): string[] {
	const out: string[] = [];
	for (const m of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) out.push(m[1]);
	for (const m of text.matchAll(/import\s+["'](\.[^"']+)["']/g)) out.push(m[1]);
	for (const m of text.matchAll(/url\(\s*["']?(\.[^"')]+)["']?\s*\)/g)) out.push(m[1]);
	return out;
}

describe("relative imports match the filesystem's exact case", () => {
	it("no import resolves only because macOS is case-insensitive", () => {
		const offenders: string[] = [];

		for (const file of sources(CHILD)) {
			const text = readFileSync(file, "utf8");
			for (const spec of relativeSpecifiers(text)) {
				const bare = spec.split("?")[0];
				const abs = resolve(dirname(file), bare);

				if (!/\.[a-z0-9]+$/i.test(bare)) continue;
				if (!existsSync(abs)) continue; // missing entirely — a real import error, and fatal already

				if (!existsWithExactCase(abs)) {
					offenders.push(`${relative(CHILD, file)}\n      ${spec}`);
				}
			}
		}

		expect(
			offenders,
			`These import paths do not match the case on disk:\n\n` +
				offenders.map((o) => `  ${o}`).join("\n\n") +
				`\n\nThey resolve on macOS because APFS is case-insensitive — the ` +
				`page renders and the build is green. They will NOT resolve on ` +
				`Linux, which is what Vercel builds on, so this ships fine and ` +
				`fails at deploy.\n\nFix the spelling to match the folder exactly.`,
		).toEqual([]);
	});

	it("the check itself works — a wrong-case path is detected as wrong", () => {
		// Guards against existsWithExactCase rotting into a no-op that always returns true.
		const real = join(CHILD, "lib", "assets");
		if (!existsSync(real) || !statSync(real).isDirectory()) return;

		expect(existsWithExactCase(real), "the real path should pass").toBe(true);
		expect(
			existsWithExactCase(join(CHILD, "lib", "ASSETS")),
			"a wrong-case path must FAIL. If this passes, the check is a no-op " +
				"and every assertion above is meaningless.",
		).toBe(false);
	});
});
