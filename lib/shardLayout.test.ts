import { describe, expect, it } from "vitest";
import {
	HEADLINE,
	HOME,
	RATING,
	MAX_PARALLAX_RATE,
	SCALE_MAX,
	SCALE_MIN,
	bounds,
	depthOf,
	layerOf,
	layoutPage,
	parallaxY,
	place,
	scaleWidth,
	type Placed,
	type ShardSpec,
} from "./shardLayout";

const WIDTHS = [360, 430, 768, 1024, 1440, 1920, 2560];

// The search card is --card-max 576px wide, or the viewport minus 16px gutters.
const cardW = (vw: number) => Math.min(576, vw - 32);
// The headline lockup: two stickers side by side, or stacked under 640px.
const lockupW = (vw: number) => (vw < 640 ? 105 : Math.min(422, vw * 0.3));

// The rating hero keeps its lockup clear; its shards sit behind the rest of the
// content by design, so it is checked for overlap and bounds, not the channel.
const sections = (vw: number) =>
	[
		{ ring: HOME, h: vw < 640 ? 504 : 767, clear: cardW(vw), name: "hero", channel: true },
		{ ring: HEADLINE, h: vw < 640 ? 450 : 538, clear: lockupW(vw), name: "headline", channel: true },
		{ ring: RATING, h: vw < 640 ? 1400 : 900, clear: lockupW(vw), name: "rating", channel: false },
	] as const;

const at = (P: Placed[], id: number) => P.find((p) => p.id === id)!;

describe("scaleWidth", () => {
	it("follows the viewport between the floor and the cap", () => {
		expect(scaleWidth(SCALE_MIN - 100)).toBe(SCALE_MIN);
		expect(scaleWidth(1000)).toBe(1000);
		expect(scaleWidth(SCALE_MAX + 1000)).toBe(SCALE_MAX);
	});
});

describe("place", () => {
	it("sizes every shard as a fixed share of the scale width", () => {
		for (const vw of WIDTHS) {
			for (const s of HOME) {
				const p = at(place(HOME, vw, 700, cardW(vw)), s.id);
				expect(p.w).toBeCloseTo((s.w / 100) * scaleWidth(vw), 6);
			}
		}
	});

	it("stops growing past SCALE_MAX", () => {
		const capped = place(HOME, SCALE_MAX, 700, 576);
		for (const p of place(HOME, 2560, 700, 576)) {
			expect(p.w).toBeCloseTo(at(capped, p.id).w, 6);
		}
	});

	it("keeps every shard's aspect ratio — width is authored, height follows", () => {
		const ref = place(HOME, 1440, 700, 576);
		for (const vw of WIDTHS) {
			for (const p of place(HOME, vw, 700, cardW(vw))) {
				expect(p.h).toBeGreaterThan(0);
				const r = at(ref, p.id);
				expect(p.w / p.h).toBeCloseTo(r.w / r.h, 6);
			}
		}
	});

	it("measures a right shard from the right edge and a left one from the left", () => {
		for (const vw of WIDTHS) {
			const P = place(HOME, vw, 700, cardW(vw));
			const ref = scaleWidth(vw);
			const gutter = Math.max(0, (ref - cardW(vw)) / 2);
			for (const s of HOME) {
				const p = at(P, s.id);
				const inner = (s.reach / 100) * (s.lane === "gutter" ? gutter : ref);
				if (s.side === "left") expect(p.x + p.w).toBeCloseTo(inner, 6);
				else expect(vw - p.x).toBeCloseTo(inner, 6);
			}
		}
	});

	it("slides a gutter shard off screen as the card fills the viewport", () => {
		const spec: ShardSpec = { id: 4, side: "left", lane: "gutter", reach: 60, y: 20, w: 24, aspect: 1.7 };
		const wide = at(place([spec], 1440, 700, 576), 4);
		const phone = at(place([spec], 390, 504, 354), 4);
		expect(wide.x + wide.w).toBeGreaterThan(200);
		expect(phone.x + phone.w).toBeLessThan(16);
	});

	it("places y as a share of the section height", () => {
		for (const s of HOME) {
			const p = at(place(HOME, 1440, 700, 576), s.id);
			expect(p.y).toBeCloseTo((s.y / 100) * 700, 6);
		}
	});

	it("is pure and never mutates the specs it is given", () => {
		const before = JSON.stringify(HOME);
		const a = place(HOME, 1440, 700, 576);
		const b = place(HOME, 1440, 700, 576);
		place(HOME, 360, 440, 328);
		expect(a).toEqual(b);
		expect(JSON.stringify(HOME)).toBe(before);
	});
});

describe("bounds", () => {
	it("is the box itself when there is no rotation", () => {
		const b = bounds({ id: 1, x: 10, y: 20, w: 100, h: 50 });
		expect(b).toEqual({ left: 10, right: 110, top: 20, bottom: 70 });
	});

	it("grows the box when rotated, about the same centre", () => {
		const b = bounds({ id: 1, x: 10, y: 20, w: 100, h: 50, rot: 10 });
		expect(b.left).toBeLessThan(10);
		expect(b.right).toBeGreaterThan(110);
		expect((b.left + b.right) / 2).toBeCloseTo(60, 6);
		expect((b.top + b.bottom) / 2).toBeCloseTo(45, 6);
	});
});

describe("editing one shard", () => {
	const edit = (
		specs: ShardSpec[], id: number, patch: Partial<ShardSpec>,
	): ShardSpec[] => specs.map((s) => (s.id === id ? { ...s, ...patch } : s));

	const others = (P: Placed[], id: number) => P.filter((p) => p.id !== id);

	it("moves or resizes only that shard", () => {
		for (const vw of WIDTHS) {
			const base = place(HOME, vw, 700, cardW(vw));
			const moved = place(edit(HOME, 4, { y: 40, reach: 30, w: 40 }), vw, 700, cardW(vw));
			expect(others(moved, 4)).toEqual(others(base, 4));
		}
	});

	it("moves shards proportionally — no thresholds, no cascades", () => {
		const sectionH = 700;
		const step = sectionH / 100;
		let prev = at(place(HOME, 1440, sectionH, 576), 1).y;
		for (let i = 1; i <= 10; i++) {
			const y = at(place(edit(HOME, 1, { y: HOME.find((s) => s.id === 1)!.y + i }), 1440, sectionH, 576), 1).y;
			expect(y - prev).toBeCloseTo(step, 6);
			prev = y;
		}
	});
});

describe("the authored rings", () => {
	it("has a unique id per shard within each ring", () => {
		for (const ring of [HOME, HEADLINE, RATING]) {
			const ids = ring.map((s) => s.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it("keeps rotation modest enough to read as scattered, not broken", () => {
		for (const ring of [HOME, HEADLINE, RATING]) {
			for (const s of ring) {
				expect(Math.abs(s.rot ?? 0)).toBeLessThanOrEqual(14);
			}
		}
	});

	it("never reaches into the content a gutter shard is meant to flank", () => {
		for (const ring of [HOME, HEADLINE, RATING]) {
			for (const s of ring) {
				if (s.lane === "gutter") expect(s.reach).toBeLessThanOrEqual(80);
			}
		}
	});

	it("stays clear of the centred content from a laptop up", () => {
		for (const vw of WIDTHS.filter((w) => w >= 1024)) {
			for (const { ring, h, clear } of sections(vw).filter((s) => s.channel)) {
				const left = (vw - clear) / 2;
				const right = vw - left;
				for (const p of place(ring, vw, h, clear)) {
					const b = bounds(p);
					expect(b.right <= left || b.left >= right).toBe(true);
				}
			}
		}
	});

	it("never lets two shards of a ring overlap from a tablet up", () => {
		for (const vw of WIDTHS.filter((w) => w >= 768)) {
			for (const { ring, h, clear } of sections(vw)) {
				const B = place(ring, vw, h, clear).map(bounds);
				for (let i = 0; i < B.length; i++) {
					for (let j = i + 1; j < B.length; j++) {
						const a = B[i];
						const b = B[j];
						const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
						expect(hit).toBe(false);
					}
				}
			}
		}
	});

	it("keeps every shard inside its section's height, bar a hang off the top edge", () => {
		for (const vw of WIDTHS) {
			for (const { ring, h, clear } of sections(vw)) {
				for (const p of place(ring, vw, h, clear)) {
					const b = bounds(p);
					// A shard may hang off the top as it does off a side; past a tenth it is lost under the nav.
					expect(b.top).toBeGreaterThanOrEqual(-h * 0.1);
					expect(b.bottom).toBeLessThanOrEqual(h + 1);
				}
			}
		}
	});

	it("hangs every shard off its own edge from a laptop up", () => {
		for (const vw of WIDTHS.filter((w) => w >= 1024)) {
			for (const { ring, h, clear } of sections(vw).filter((s) => s.channel)) {
				for (const p of place(ring, vw, h, clear)) {
					const s = ring.find((q) => q.id === p.id)!;
					if (s.side === "left") expect(p.x).toBeLessThan(0);
					else expect(p.x + p.w).toBeGreaterThan(vw);
				}
			}
		}
	});

	it("leaves every viewport-edge shard at least partly on screen at every width", () => {
		for (const vw of WIDTHS) {
			for (const { ring, h, clear } of sections(vw)) {
				for (const p of place(ring, vw, h, clear)) {
					const s = ring.find((q) => q.id === p.id)!;
					if (s.lane !== "edge") continue;
					expect(p.x + p.w).toBeGreaterThan(24);
					expect(p.x).toBeLessThan(vw - 24);
				}
			}
		}
	});
});

describe("layoutPage", () => {
	it("resolves each section independently", () => {
		const vw = 1440;
		const [hero, head] = layoutPage(vw, [
			{ height: 700, clearW: 576, specs: HOME },
			{ height: 520, clearW: 420, specs: HEADLINE },
		]);
		expect(hero).toEqual(place(HOME, vw, 700, 576));
		expect(head).toEqual(place(HEADLINE, vw, 520, 420));
	});

	it("does not let one section's height affect the other's shards", () => {
		const vw = 1440;
		const [heroA] = layoutPage(vw, [
			{ height: 700, clearW: 576, specs: HOME },
			{ height: 520, clearW: 420, specs: HEADLINE },
		]);
		const [heroB] = layoutPage(vw, [
			{ height: 700, clearW: 576, specs: HOME },
			{ height: 900, clearW: 420, specs: HEADLINE },
		]);
		expect(heroA).toEqual(heroB);
	});
});

describe("depth", () => {
	it("gives the widest shard depth 1 and the narrowest near 0", () => {
		const P = place(HOME, 1440, 700, 576);
		const widest = Math.max(...P.map((p) => p.w));
		const narrowest = P.reduce((a, b) => (a.w <= b.w ? a : b));
		const biggest = P.reduce((a, b) => (a.w >= b.w ? a : b));
		expect(depthOf(biggest, widest)).toBeCloseTo(1, 6);
		// Near, not exactly, 0: NARROWEST_RATIO is a fixed floor, not the live minimum.
		expect(depthOf(narrowest, widest)).toBeLessThan(0.1);
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
