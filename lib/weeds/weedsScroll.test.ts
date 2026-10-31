import { describe, expect, it } from "vitest";
import { scrollTopFor, tabIndexFor } from "./weedsScroll";

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
