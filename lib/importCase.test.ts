/**
 * EVERY RELATIVE IMPORT MUST MATCH THE FILESYSTEM'S EXACT CASE.
 *
 * THE LIE THIS EXISTS TO CATCH
 * macOS formats APFS case-INSENSITIVE by default. `./assets/pub-Rtvr/x.webp`
 * and `./assets/pub-Rtvr/x.webp` are the same file to it, so Vite resolves a
 * misspelled import, the page renders, and nothing anywhere reports a problem.
 * The editor's red squiggle is the ONLY signal, and a squiggle is not a gate.
 *
 * MEASURED 25 Aug 2026: `pub-Rtvr` (wrong case) opened the file successfully
 * on this machine. The globe kept spinning. The build stayed green.
 *
 * WHY IT MATTERS MORE THAN A TYPO
 * Linux is case-SENSITIVE, and Linux is what Vercel builds on. So a casing
 * mistake is invisible on every developer's Mac and fatal in production —
 * the failure appears at deploy time, in someone else's terminal, detached
 * from the edit that caused it.
 *
 * This is not a silent failure; it is a silent PASS, which is worse. A local
 * "it works" is not evidence when the filesystem is more permissive than the
 * one that will run the code.
 *
 * So the case is asserted against what readdir actually REPORTS, rather than
 * against whether the file opens — because opening is exactly the check that
 * lies here.
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

/**
 * Does this path exist with EXACTLY this spelling?
 *
 * existsSync() cannot answer that on a case-insensitive volume — it says yes
 * to any casing. The only reliable check is to read each parent directory and
 * look for the segment in the listing, which reports true on-disk names.
 */
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

				// Extensionless specifiers resolve through several candidate
				// paths; only assert the ones that name a file outright.
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
		// Guard against the guard rotting into a no-op: if existsWithExactCase
		// ever starts returning true unconditionally, every test above passes
		// while checking nothing.
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
