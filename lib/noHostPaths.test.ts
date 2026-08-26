/**
 * A CHILD MAY NOT NAME A HOST PATH.
 *
 * The rule, and why a test rather than a convention:
 *
 * An `import` is resolved by the bundler at BUILD time — the bytes are copied
 * into whatever app builds this child, so the asset travels with it. A URL
 * beginning with "/" is resolved by the BROWSER at RUNTIME, against whatever
 * server is answering. Only ReTreever serves /pub-Rtvr/…, so in any other host
 * every one of those is a 404.
 *
 * MEASURED, 25 Aug 2026: a clean-room install of this child returned 200 for
 * the page and 404 for all 28 assets. Nothing failed the build. Nothing warned.
 * A string is not a dependency, so no tool can see it — which is precisely why
 * it has to be a test.
 *
 * TWO TRAPS THIS EXISTS TO CATCH, both invisible to a casual grep:
 *   1. Assets OUTSIDE /pub-Rtvr — /golden_sky_background.webp and
 *      /hill_pattern.webp sit at ReTreever's static root. A "/pub-Rtvr" grep
 *      misses both, so this matches on the EXTENSION instead.
 *   2. Assembled URLs — GrassTufts built 20 paths from a template string and
 *      the 13 shard SVGs carry theirs inside the markup. Neither appears in
 *      source as a literal. Hence the check runs over inlined .svg files too,
 *      and the template-literal form is matched explicitly.
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

/**
 * A root-relative reference to an image/font file, in the forms it actually
 * appears in: CSS url(), an SVG/img href or src, or an import specifier —
 * each optionally containing a ${...} hole, since assembled URLs are the ones
 * no grep would otherwise catch.
 *
 * It is anchored on those prefixes deliberately. An earlier version matched a
 * leading "/" after ANY quote, which flagged `p.endsWith(`/${name}.webp`)` —
 * a string comparison against a bundled path, not a request to a server. A
 * guard that cries wolf gets deleted, so it matches only the syntax that
 * actually issues a fetch.
 */
const HOST_PATH =
	/(?:url\(|href=|src=|from\s*)["'`]\/[A-Za-z0-9._/-]*(?:\$\{[^}]*\})?[A-Za-z0-9._/-]*\.(?:webp|avif|png|jpe?g|gif|svg|woff2?)/g;

describe("the child names no host paths", () => {
	it("every asset is imported, never requested from the host by URL", () => {
		const offenders: string[] = [];

		for (const file of sources(CHILD)) {
			const text = readFileSync(file, "utf8");
			for (const line of text.split("\n")) {
				// A line that is purely a comment is documentation about this
				// rule, not a violation of it.
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

/**
 * A TOKEN NOTHING READS GOVERNS NOTHING.
 *
 * Written after making the mistake: app.css declared --rtvr-surface and the
 * violet fallback, and every white in the child was still a literal #fff. The
 * stylesheet looked complete, "make white purple" had already been done on
 * paper, and the page rendered exactly as white as before — because declaring
 * a custom property and reading one are different acts, and only the second
 * changes a pixel.
 *
 * It is the same failure as lib/unhitched.css, which sat 117 lines long with
 * zero importers: code that describes an intention rather than performing it.
 * Neither a compiler nor a reviewer catches this, because nothing is wrong —
 * there is merely nothing there.
 */
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

	/**
	 * "every token app.css defines is read by something" USED TO LIVE HERE and
	 * has moved to ReTreever/src/lib/core/harnessGuards/appUniqueSplit.test.ts.
	 *
	 * The child briefly shipped its own lib/app.css holding --rtvr-* tokens.
	 * That was a second source of truth, so it was deleted: the tokens now live
	 * in app.unique.css — one copy per PARENT, same filename, different values,
	 * which is what makes "which parent is this?" visible on screen.
	 *
	 * The child no longer defines any token, so there is nothing to check here.
	 * It only READS them, and the test above proves it reads them rather than
	 * hardcoding white.
	 */
});
