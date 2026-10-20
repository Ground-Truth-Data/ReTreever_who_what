// Measures the window SVG the way the browser draws it and checks the cuts
// against it, so a re-export that moves the panel fails here, not on a phone.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WINDOW_BOX, WINDOW_CUT, windowBorderCss, windowPanel, windowSliceCss } from "./dropWindow";

const svg = readFileSync(
	fileURLToPath(new URL("./ratingAssets/Rating_page_search_dropdown.svg", import.meta.url)),
	"utf8",
);

type M = [number, number, number, number, number, number];
type Pt = [number, number];

const mul = (a: M, b: M): M => [
	a[0] * b[0] + a[2] * b[1],
	a[1] * b[0] + a[3] * b[1],
	a[0] * b[2] + a[2] * b[3],
	a[1] * b[2] + a[3] * b[3],
	a[0] * b[4] + a[2] * b[5] + a[4],
	a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m: M, [x, y]: Pt): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(t: string | undefined): M {
	if (!t) return [1, 0, 0, 1, 0, 0];
	const nums = t.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
	if (t.startsWith("translate")) return [1, 0, 0, 1, nums[0], nums[1] ?? 0];
	if (t.startsWith("matrix")) return nums as M;
	throw new Error(`unhandled transform ${t}`);
}

/** A path of one relative move and relative lines, closed: the only grammar the window uses. */
function parsePath(d: string): Pt[] {
	const m = /^m\s+([\s\S]*?)\s*z$/i.exec(d.trim());
	if (!m || !d.trim().startsWith("m")) throw new Error(`unhandled path ${d}`);
	const nums = m[1].split(/[\s,]+/).map(Number);
	const pts: Pt[] = [];
	let x = 0;
	let y = 0;
	for (let i = 0; i < nums.length; i += 2) {
		x += nums[i];
		y += nums[i + 1];
		pts.push([x, y]);
	}
	return pts;
}

/** Every path with its points in viewBox units, through the <g> transforms above it. */
function drawn(): { style: string; pts: Pt[] }[] {
	const out: { style: string; pts: Pt[] }[] = [];
	const stack: M[] = [[1, 0, 0, 1, 0, 0]];
	for (const tag of svg.matchAll(/<(\/?)(g|path)\b([^>]*?)(\/?)>/g)) {
		const [, close, name, attrs, selfClose] = tag;
		const attr = (k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(attrs)?.[1];
		if (name === "g") {
			if (close) stack.pop();
			else stack.push(mul(stack[stack.length - 1], parseTransform(attr("transform"))));
			continue;
		}
		const m = mul(stack[stack.length - 1], parseTransform(attr("transform")));
		out.push({ style: attr("style") ?? "", pts: parsePath(attr("d")!).map((p) => apply(m, p)) });
		if (!selfClose) stack.push(stack[stack.length - 1]);
	}
	return out;
}

const bbox = (pts: Pt[]) => ({
	x0: Math.min(...pts.map((p) => p[0])),
	y0: Math.min(...pts.map((p) => p[1])),
	x1: Math.max(...pts.map((p) => p[0])),
	y1: Math.max(...pts.map((p) => p[1])),
});

/** Inside a convex polygon given in one winding, edges included. */
function inside(quad: Pt[], [px, py]: Pt): boolean {
	let sign = 0;
	for (let i = 0; i < quad.length; i++) {
		const [ax, ay] = quad[i];
		const [bx, by] = quad[(i + 1) % quad.length];
		const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
		if (Math.abs(cross) < 1e-9) continue;
		if (sign === 0) sign = Math.sign(cross);
		else if (Math.sign(cross) !== sign) return false;
	}
	return true;
}

describe("the search dropdown window", () => {
	const paths = drawn();
	const frame = paths.find((p) => /stroke:#fad702/.test(p.style));
	const panel = paths.find((p) => /fill:#000000/.test(p.style) && /stroke:none/.test(p.style));

	it("is the gold frame and the black panel, nothing else", () => {
		expect(paths).toHaveLength(2);
		expect(frame).toBeDefined();
		expect(panel).toBeDefined();
		expect(/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!.slice(1).map(Number)).toEqual([
			WINDOW_BOX.w,
			WINDOW_BOX.h,
		]);
	});

	it("fills its viewBox: no stray subpath pads the drawn box", () => {
		const b = bbox(frame!.pts);
		const slack = 4.5;
		expect(b.x0).toBeLessThan(slack);
		expect(b.y0).toBeLessThan(slack);
		expect(b.x1).toBeGreaterThan(WINDOW_BOX.w - slack);
		expect(b.y1).toBeGreaterThan(WINDOW_BOX.h - slack);
	});

	it("cuts just inside the black panel, so the list never paints on the frame", () => {
		const r = windowPanel();
		for (const corner of [
			[r.x0, r.y0],
			[r.x1, r.y0],
			[r.x1, r.y1],
			[r.x0, r.y1],
		] as Pt[]) {
			expect(inside(panel!.pts, corner), `corner ${corner} outside the panel`).toBe(true);
		}
		const b = bbox(panel!.pts);
		expect(r.x0 - b.x0).toBeLessThan(10);
		expect(b.x1 - r.x1).toBeLessThan(10);
		expect(r.y0 - b.y0).toBeLessThan(4);
		expect(b.y1 - r.y1).toBeLessThan(4);
	});

	it("writes the same cuts into CSS", () => {
		expect(windowSliceCss()).toBe("6.110% 4.424% 14.720% 5.939%");
		expect(windowBorderCss("var(--u)")).toBe(
			"calc(4.4 * var(--u)) calc(14.6 * var(--u)) calc(10.6 * var(--u)) calc(19.6 * var(--u))",
		);
		expect(WINDOW_CUT.left + WINDOW_CUT.right).toBeLessThan(WINDOW_BOX.w / 4);
	});
});
