import { describe, expect, it } from "vitest";
import { focusIndex } from "./weedsFocus";

// 100 rows of 40px under a 40px header, in a 400px window: 360px of rows show at once.
const tops = Array.from({ length: 100 }, (_, i) => 40 + i * 40);
const maxScroll = 40 + 100 * 40 - 400;
const at = (scrollTop: number) => focusIndex(tops, scrollTop + 40, 360, scrollTop / maxScroll);

describe("focusIndex — the reading cursor", () => {
	it("lights the first row at the top and the last at the bottom", () => {
		expect(at(0)).toBe(0);
		expect(at(maxScroll)).toBe(99);
	});

	it("walks every row in order as the scroll goes down", () => {
		const lit = Array.from({ length: maxScroll + 1 }, (_, y) => at(y));
		expect(new Set(lit).size).toBe(100);
		expect(lit.every((v, i) => i === 0 || v >= lit[i - 1])).toBe(true);
	});

	it("clamps a progress the browser overshoots, and survives an empty table", () => {
		expect(focusIndex(tops, 40, 360, -0.2)).toBe(0);
		expect(focusIndex(tops, maxScroll + 40, 360, 1.3)).toBe(99);
		expect(focusIndex([], 0, 360, 0.5)).toBe(0);
	});
});
