import { describe, expect, it } from "vitest";
import {
	HEADLINE,
	HOME,
	MAX_PARALLAX_RATE,
	depthOf,
	layerOf,
	layoutPage,
	parallaxY,
	place,
	type ShardSpec,
} from "./shardLayout";

const WIDTHS = [360, 430, 768, 1024, 1440, 1920, 2560];

describe("place", () => {
	it("puts a shard exactly where the config says", () => {
		const vw = 1440;
		const sectionH = 700;
		const P = place(HOME, vw, sectionH);
		for (const spec of HOME) {
			const p = P.find((q) => q.id === spec.id)!;
			expect(p.x).toBeCloseTo((spec.x / 100) * vw, 6);
			expect(p.y).toBeCloseTo((spec.y / 100) * sectionH, 6);
		}
	});

	it("keeps every shard's aspect ratio — width is authored, height follows", () => {
		for (const vw of WIDTHS) {
			for (const p of place(HOME, vw, 700)) {
				expect(p.h).toBeGreaterThan(0);
				const ratio = p.w / p.h;
				const at1440 = place(HOME, 1440, 700).find((q) => q.id === p.id)!;
				expect(ratio).toBeCloseTo(at1440.w / at1440.h, 6);
			}
		}
	});

	it("clamps width between minw and maxw", () => {
		for (const vw of WIDTHS) {
			for (const spec of HOME) {
				const p = place(HOME, vw, 700).find((q) => q.id === spec.id)!;
				expect(p.w).toBeGreaterThanOrEqual(spec.minw);
				expect(p.w).toBeLessThanOrEqual(spec.maxw);
			}
		}
	});

	it("is pure — the same inputs always give the same output", () => {
		const a = place(HOME, 1440, 700);
		const b = place(HOME, 1440, 700);
		expect(a).toEqual(b);
	});

	it("never mutates the specs it is given", () => {
		const before = JSON.stringify(HOME);
		place(HOME, 1440, 700);
		place(HOME, 360, 440);
		expect(JSON.stringify(HOME)).toBe(before);
	});
});

describe("editing one shard", () => {
	const edit = (
		specs: ShardSpec[], id: number, patch: Partial<ShardSpec>,
	): ShardSpec[] => specs.map((s) => (s.id === id ? { ...s, ...patch } : s));

	const others = (P: ReturnType<typeof place>, id: number) =>
		P.filter((p) => p.id !== id);

	it("moves only that shard when you change its y", () => {
		for (const vw of WIDTHS) {
			const base = place(HOME, vw, 700);
			const moved = place(edit(HOME, 1, { y: HOME[0].y + 20 }), vw, 700);
			expect(others(moved, 1)).toEqual(others(base, 1));
		}
	});

	it("moves only that shard when you change its x", () => {
		for (const vw of WIDTHS) {
			const base = place(HOME, vw, 700);
			const moved = place(edit(HOME, 4, { x: 40 }), vw, 700);
			expect(others(moved, 4)).toEqual(others(base, 4));
		}
	});

	it("resizes only that shard when you change its w", () => {
		for (const vw of WIDTHS) {
			const base = place(HOME, vw, 700);
			const bigger = place(edit(HOME, 5, { w: 45, maxw: 900 }), vw, 700);
			expect(others(bigger, 5)).toEqual(others(base, 5));
		}
	});

	it("moves shards proportionally — no thresholds, no cascades", () => {
		const vw = 1440;
		const sectionH = 700;
		const step = (sectionH * 1) / 100;
		let prev = place(HOME, vw, sectionH).find((p) => p.id === 1)!.y;
		for (let i = 1; i <= 10; i++) {
			const y = place(edit(HOME, 1, { y: HOME[0].y + i }), vw, sectionH)
				.find((p) => p.id === 1)!.y;
			expect(y - prev).toBeCloseTo(step, 6);
			prev = y;
		}
	});

	it("puts a shard off-page only when the config asks for it", () => {
		for (const vw of WIDTHS) {
			for (const p of place(HOME, vw, 700)) {
				const spec = HOME.find((s) => s.id === p.id)!;
				if (spec.x >= 0) expect(p.x).toBeGreaterThanOrEqual(0);
				expect(p.x + p.w).toBeGreaterThan(0);
				expect(p.x).toBeLessThan(vw);
			}
		}
	});
});

describe("the authored rings", () => {
	it("has a unique id per shard within each ring", () => {
		for (const ring of [HOME, HEADLINE]) {
			const ids = ring.map((s) => s.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it("keeps rotation modest enough to read as scattered, not broken", () => {
		for (const ring of [HOME, HEADLINE]) {
			for (const s of ring) {
				expect(Math.abs(s.rot ?? 0)).toBeLessThanOrEqual(14);
			}
		}
	});

	it("leaves every shard at least partly on screen at every width", () => {
		for (const vw of WIDTHS) {
			for (const ring of [HOME, HEADLINE]) {
				for (const p of place(ring, vw, 700)) {
					expect(p.x + p.w).toBeGreaterThan(0);
					expect(p.x).toBeLessThan(vw);
				}
			}
		}
	});
});

describe("layoutPage", () => {
	it("resolves each section independently", () => {
		const vw = 1440;
		const [hero, head] = layoutPage(vw, [
			{ height: 700, specs: HOME },
			{ height: 520, specs: HEADLINE },
		]);
		expect(hero).toEqual(place(HOME, vw, 700));
		expect(head).toEqual(place(HEADLINE, vw, 520));
	});

	it("does not let one section's height affect the other's shards", () => {
		const vw = 1440;
		const [heroA] = layoutPage(vw, [
			{ height: 700, specs: HOME },
			{ height: 520, specs: HEADLINE },
		]);
		const [heroB] = layoutPage(vw, [
			{ height: 700, specs: HOME },
			{ height: 900, specs: HEADLINE },
		]);
		expect(heroA).toEqual(heroB);
	});
});

describe("depth", () => {
	it("gives the widest shard depth 1 and the narrowest depth 0", () => {
		const P = place(HOME, 1440, 700);
		const widest = Math.max(...P.map((p) => p.w));
		const narrowest = P.reduce((a, b) => (a.w <= b.w ? a : b));
		const biggest = P.reduce((a, b) => (a.w >= b.w ? a : b));
		expect(depthOf(biggest, widest)).toBeCloseTo(1, 6);
		expect(depthOf(narrowest, widest)).toBeLessThan(0.02);
	});

	it("is monotonic in width", () => {
		const widest = 500;
		const a = depthOf({ id: 1, x: 0, y: 0, w: 200, h: 100 }, widest);
		const b = depthOf({ id: 1, x: 0, y: 0, w: 400, h: 100 }, widest);
		expect(b).toBeGreaterThan(a);
	});

	it("stays inside 0..1 for any width", () => {
		for (const w of [0, 1, 250, 500, 5000]) {
			const d = depthOf({ id: 1, x: 0, y: 0, w, h: 100 }, 500);
			expect(d).toBeGreaterThanOrEqual(0);
			expect(d).toBeLessThanOrEqual(1);
		}
	});

	it("bands depth into three integer layers", () => {
		expect(layerOf(1)).toBe(0);
		expect(layerOf(0.5)).toBe(-1);
		expect(layerOf(0)).toBe(-2);
		for (const d of [0, 0.2, 0.4, 0.7, 1]) {
			expect(Number.isInteger(layerOf(d))).toBe(true);
		}
	});
});

describe("parallax", () => {
	it("moves near shards more than far ones", () => {
		expect(Math.abs(parallaxY(1, 500))).toBeGreaterThan(
			Math.abs(parallaxY(0.2, 500)),
		);
	});

	it("is zero at the top of the page", () => {
		// toBeCloseTo, not toBe — the formula can yield -0, which Object.is (and toBe) treats as != 0.
		expect(parallaxY(1, 0)).toBeCloseTo(0, 10);
	});

	it("rises against the scroll", () => {
		expect(parallaxY(1, 500)).toBeLessThan(0);
	});

	it("never travels more than MAX_PARALLAX_RATE of the scroll", () => {
		for (const scrolled of [0, 100, 1000, 5000]) {
			expect(Math.abs(parallaxY(1, scrolled)))
				.toBeLessThanOrEqual(scrolled * MAX_PARALLAX_RATE + 1e-9);
		}
	});
});
