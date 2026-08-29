/**
 * ⚠️ A child must not reference a host-relative URL (e.g. /pub-Rtvr/...) — only ReTreever serves those paths, so anywhere else it's a silent 404 that no build step catches. Import assets instead.
 */
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CHILD = fileURLToPath(new URL("..", import.meta.url));
const EXT = new Set([".svelte", ".ts", ".js", ".css", ".svg"]);

/** Every source file in the child, minus its own assets and node_modules. */
function sources(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name === "assets") continue;
		if (e.name.startsWith(".")) continue;
		const full = join(dir, e.name);
		if (e.isDirectory()) sources(full, out);
		else if (EXT.has(extname(e.name))) out.push(full);
	}
	return out;
}

/** Root-relative asset reference: CSS url(), href=/src=, or an import specifier — optionally with a ${...} hole. */
const HOST_PATH =
	/(?:url\(|href=|src=|from\s*)["'`]\/[A-Za-z0-9._/-]*(?:\$\{[^}]*\})?[A-Za-z0-9._/-]*\.(?:webp|avif|png|jpe?g|gif|svg|woff2?)/g;

describe("the child names no host paths", () => {
	it("every asset is imported, never requested from the host by URL", () => {
		const offenders: string[] = [];

		for (const file of sources(CHILD)) {
			const text = readFileSync(file, "utf8");
			for (const line of text.split("\n")) {
				const t = line.trim();
				if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) {
					continue;
				}
				for (const m of line.matchAll(HOST_PATH)) {
					offenders.push(`${relative(CHILD, file)}: ${m[0].slice(1)}`);
				}
			}
		}

		expect(
			offenders,
			`These name a path on the HOST's web server:\n\n` +
				offenders.map((o) => `  ${o}`).join("\n") +
				`\n\nThat only resolves inside ReTreever. In rapper, in a clean ` +
				`install, or in anyone else's app it is a 404 — and NOTHING will ` +
				`tell you, because a string is not a dependency.\n\n` +
				`Fix: import it.\n` +
				`  import art from "./assets/<path>";     // one file\n` +
				`  import.meta.glob("./assets/<dir>/*.webp", { eager: true, ` +
				`query: "?url", import: "default" })      // a computed set\n\n` +
				`Then hand it to CSS as a custom property, with ` +
				`var(--rtvr-missing-art) as the fallback so an absent asset ` +
				`paints violet instead of failing silently.`,
		).toEqual([]);
	});

	it("no static/ directory — a host never serves a dependency's static files", () => {
		const names = readdirSync(CHILD).map((e) => e);
		expect(
			names.includes("static"),
			`The child has a static/ directory. It looks like it fixes missing ` +
				`assets and does not: a consuming app serves ITS OWN static/, never ` +
				`a dependency's. MEASURED — 6.7 MB of copied art changed nothing, ` +
				`all 28 assets still 404'd.\n\nPut art in lib/assets/ and import it.`,
		).toBe(false);
	});
});

// ⚠️ A CSS custom property that nothing reads governs nothing — declaring --rtvr-* and its fallback doesn't change a pixel unless something actually reads var(--x).
describe("the child's colour tokens are actually used", () => {
	it("no hardcoded white — every white reads a token, so a parent can change it", () => {
		const offenders: string[] = [];
		const WHITE = /(?:color|fill|background(?:-color)?)\s*[:=]\s*"?(#fff(?:fff)?\b|white\b|rgba?\(\s*255\s*,\s*255\s*,\s*255)/gi;

		for (const file of sources(CHILD)) {
			const text = readFileSync(file, "utf8");
			for (const [i, line] of text.split("\n").entries()) {
				const t = line.trim();
				if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) {
					continue;
				}
				for (const m of line.matchAll(WHITE)) {
					offenders.push(`${relative(CHILD, file)}:${i + 1}  ${m[0].trim()}`);
				}
			}
		}

		expect(
			offenders,
			`These paint white directly instead of reading a token:\n\n` +
				offenders.map((o) => `  ${o}`).join("\n") +
				`\n\nA literal cannot be overridden, so the child looks identical ` +
				`under both parents and the pill becomes a label that asserts ` +
				`something the page does not show.\n\n` +
				`Fix: use var(--rtvr-on-dark) — defined in each parent's app.unique.css. ` +
				`It is violet unparented and white under .rtvr-hitched.`,
		).toEqual([]);
	});

});
