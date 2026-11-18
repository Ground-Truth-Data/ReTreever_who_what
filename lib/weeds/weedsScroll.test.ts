import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { headX, progressFor, scrollTopFor, tabIndexFor } from "./weedsScroll";

const STEP = 500;
const N = 7;

describe("tabIndexFor", () => {
	it("walks one tab per step", () => {
		expect(tabIndexFor(0, STEP, N)).toBe(0);
		expect(tabIndexFor(STEP, STEP, N)).toBe(1);
		expect(tabIndexFor(3 * STEP, STEP, N)).toBe(3);
		expect(tabIndexFor(6 * STEP, STEP, N)).toBe(6);
	});

	it("rounds at the half step", () => {
		expect(tabIndexFor(0.49 * STEP, STEP, N)).toBe(0);
		expect(tabIndexFor(0.5 * STEP, STEP, N)).toBe(1);
		expect(tabIndexFor(2.4 * STEP, STEP, N)).toBe(2);
		expect(tabIndexFor(2.5 * STEP, STEP, N)).toBe(3);
	});

	it("holds the first tab for any negative progress", () => {
		expect(tabIndexFor(-1, STEP, N)).toBe(0);
		expect(tabIndexFor(-0.4 * STEP, STEP, N)).toBe(0);
		expect(tabIndexFor(-100 * STEP, STEP, N)).toBe(0);
		expect(Object.is(tabIndexFor(-0.4 * STEP, STEP, N), -0)).toBe(false);
	});

	it("holds the last tab past the track", () => {
		expect(tabIndexFor(6.6 * STEP, STEP, N)).toBe(6);
		expect(tabIndexFor(60 * STEP, STEP, N)).toBe(6);
	});

	it("is always 0 with one tab, or no step", () => {
		expect(tabIndexFor(50 * STEP, STEP, 1)).toBe(0);
		expect(tabIndexFor(-50 * STEP, STEP, 1)).toBe(0);
		expect(tabIndexFor(3 * STEP, 0, N)).toBe(0);
		expect(tabIndexFor(3 * STEP, Number.NaN, N)).toBe(0);
	});
});

describe("scrollTopFor", () => {
	it("lands on the segment's centre, a round trip through tabIndexFor", () => {
		const trackTop = 1234;
		expect(scrollTopFor(0, trackTop, STEP)).toBe(trackTop);
		expect(scrollTopFor(3, trackTop, STEP)).toBe(trackTop + 3 * STEP);
		for (let i = 0; i < N; i++) {
			expect(tabIndexFor(scrollTopFor(i, trackTop, STEP) - trackTop, STEP, N)).toBe(i);
		}
	});
});

describe("progressFor", () => {
	it("is continuous between tabs and agrees with tabIndexFor", () => {
		expect(progressFor(0, STEP, N)).toBe(0);
		expect(progressFor(2.5 * STEP, STEP, N)).toBe(2.5);
		expect(progressFor(6 * STEP, STEP, N)).toBe(6);
		for (const o of [0.2, 1.49, 1.5, 3.7, 5.99]) {
			expect(Math.round(progressFor(o * STEP, STEP, N))).toBe(tabIndexFor(o * STEP, STEP, N));
		}
	});

	it("clamps above and past the run, and is 0 with no step", () => {
		expect(progressFor(-300, STEP, N)).toBe(0);
		expect(Object.is(progressFor(-300, STEP, N), -0)).toBe(false);
		expect(progressFor(60 * STEP, STEP, N)).toBe(6);
		expect(progressFor(3 * STEP, 0, N)).toBe(0);
		expect(progressFor(3 * STEP, Number.NaN, N)).toBe(0);
	});
});

describe("headX", () => {
	// Lit tabs are wider, so the centres are uneven on purpose.
	const centres = [30, 90, 170, 240, 300, 380, 450];

	it("sits on a tab's centre at each whole step", () => {
		centres.forEach((c, i) => expect(headX(i, centres)).toBe(c));
	});

	it("moves between two centres by the fraction", () => {
		expect(headX(2.5, centres)).toBe(205);
		expect(headX(0.25, centres)).toBe(45);
		expect(headX(5.9, centres)).toBeCloseTo(443);
	});

	it("holds the ends", () => {
		expect(headX(-1, centres)).toBe(30);
		expect(headX(9, centres)).toBe(450);
		expect(headX(3, [])).toBe(0);
		expect(headX(3, [12])).toBe(12);
	});
});

describe("the rating messages", () => {
	const read = (l: string) => JSON.parse(readFileSync(new URL(`../../messages/rating/${l}.json`, import.meta.url), "utf8"));
	const en = read("en");
	const holes = (v: unknown) => [...JSON.stringify(v).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();

	it("every language has every key, with the same placeholders", () => {
		for (const l of ["es", "pt-BR", "fr"]) {
			const other = read(l);
			expect(Object.keys(other).sort(), l).toEqual(Object.keys(en).sort());
			for (const k of Object.keys(en)) expect(holes(other[k]), `${l} ${k}`).toEqual(holes(en[k]));
		}
	});
});
