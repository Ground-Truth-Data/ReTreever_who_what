import { describe, expect, it } from "vitest";
import { WEEDS_TABLES } from "../whoWhatTypes";
import { TABLE_LABELS, TABLE_SCORES, type TallyLine, ladderValue, sumsThrough, tween } from "./tallyMath";

// The demo project e-ln5pa3mmvn39ogex, 594 / 672, as the host answers it.
const DEMO: TallyLine[] = [
	{ table: "projects", awarded: 4, available: 5 },
	{ table: "crop", awarded: 5, available: 14 },
	{ table: "planting", awarded: 0, available: 0 },
	{ table: "land", awarded: 576, available: 624 },
	{ table: "polymorphic", awarded: 0, available: 15 },
	{ table: "stakeholders", awarded: 0, available: 2 },
	{ table: "sources", awarded: 9, available: 12 },
];

describe("sumsThrough", () => {
	it("accumulates tab by tab and closes on the hero's number", () => {
		expect(sumsThrough(DEMO, 0)).toEqual({ scored: 4, available: 5, pct: 80 });
		expect(sumsThrough(DEMO, 1)).toEqual({ scored: 9, available: 19, pct: 47.4 });
		expect(sumsThrough(DEMO, 2)).toEqual({ scored: 9, available: 19, pct: 47.4 });
		expect(sumsThrough(DEMO, 3)).toEqual({ scored: 585, available: 643, pct: 91 });
		expect(sumsThrough(DEMO, 6)).toEqual({ scored: 594, available: 672, pct: 88.4 });
	});

	it("has no percentage while nothing is on offer", () => {
		const bare = WEEDS_TABLES.map((table) => ({ table, awarded: 0, available: 0 }));
		expect(sumsThrough(bare, 6)).toEqual({ scored: 0, available: 0, pct: null });
		expect(sumsThrough(DEMO, -1)).toEqual({ scored: 0, available: 0, pct: null });
	});
});

describe("tween", () => {
	it("starts at `from`, ends at `to`, and eases out", () => {
		expect(tween(4, 594, 0)).toBe(4);
		expect(tween(4, 594, 1)).toBe(594);
		expect(tween(0, 100, 0.5)).toBe(87.5);
		expect(tween(100, 0, 0.5)).toBe(12.5);
	});

	it("is monotone and clamps past the ends", () => {
		let last = -1;
		for (let i = 0; i <= 20; i++) {
			const v = tween(0, 594, i / 20);
			expect(v).toBeGreaterThanOrEqual(last);
			last = v;
		}
		expect(tween(0, 10, -1)).toBe(0);
		expect(tween(0, 10, 2)).toBe(10);
	});
});

describe("ladderValue", () => {
	it("shows a line's points through the lit tab, a dash with nothing on offer, a dot past it", () => {
		expect(ladderValue(DEMO[0], 0, 3)).toEqual({ awarded: 4, available: 5 });
		expect(ladderValue(DEMO[3], 3, 3)).toEqual({ awarded: 576, available: 624 });
		expect(ladderValue(DEMO[2], 2, 3)).toBe("–");
		expect(ladderValue(DEMO[4], 4, 3)).toBe("·");
	});
});

describe("the words", () => {
	it("name every table once", () => {
		for (const t of WEEDS_TABLES) {
			expect(TABLE_LABELS[t]).toMatch(/^[A-Z]/);
			expect(TABLE_SCORES[t].length).toBeGreaterThan(8);
		}
	});
});
