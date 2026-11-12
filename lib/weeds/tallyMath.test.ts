import { describe, expect, it } from "vitest";
import { WEEDS_TABLES, type ScoreTally } from "../whoWhatTypes";
import { TABLE_LABELS, TABLE_SCORES, type TallyLine, barFill, ladderValue, sumsThrough, tallyTargets, tween } from "./tallyMath";

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

// ACTIVE TREES as the host answers it: the tables sum to 513, the stored score is 514 of 560.
const ACTIVE: TallyLine[] = [
	{ table: "projects", awarded: 4, available: 5 },
	{ table: "crop", awarded: 0, available: 0 },
	{ table: "planting", awarded: 13, available: 16 },
	{ table: "land", awarded: 479, available: 507 },
	{ table: "polymorphic", awarded: 2, available: 14 },
	{ table: "stakeholders", awarded: 6, available: 6 },
	{ table: "sources", awarded: 9, available: 12 },
];
const project: ScoreTally = { kind: "project", scored: true, rating: 91.8, pointsScored: 514, pointsAvailable: 560, planted: 20, tables: ACTIVE };
const org: ScoreTally = { ...project, kind: "org", rating: 90.4, org: { projects: 3, mean: 91.8, claimed: 0, planted: 20, undisclosed: 0 } };

describe("tallyTargets", () => {
	it("counts the tables' running sums before the last tab", () => {
		expect(tallyTargets(project, 0)).toEqual({ scored: 4, available: 5, big: 80 });
		expect(tallyTargets(project, 5)).toEqual({ scored: 504, available: 548, big: 92 });
	});

	it("lands the last tab on the stored score despite drift", () => {
		expect(sumsThrough(ACTIVE, 6)).toEqual({ scored: 513, available: 560, pct: 91.6 });
		expect(tallyTargets(project, 6)).toEqual({ scored: 514, available: 560, big: 91.8 });
	});

	it("holds an org on its projects' mean until the last tab, then its number after claims", () => {
		expect(tallyTargets(org, 0)).toEqual({ scored: 4, available: 5, big: 91.8 });
		expect(tallyTargets(org, 6)).toEqual({ scored: 514, available: 560, big: 90.4 });
	});

	it("falls back to the sums where nothing is stored", () => {
		const bare: ScoreTally = { ...project, rating: null, pointsScored: null, pointsAvailable: null };
		expect(tallyTargets(bare, 6)).toEqual({ scored: 513, available: 560, big: 91.6 });
	});
});

describe("barFill", () => {
	it("fills to the share through the lit tab, empty past it, none with nothing on offer", () => {
		expect(barFill(ACTIVE[0], 0, 3)).toBe(0.8);
		expect(barFill(ACTIVE[5], 5, 6)).toBe(1);
		expect(barFill(ACTIVE[1], 1, 6)).toBeNull();
		expect(barFill(ACTIVE[4], 4, 3)).toBe(0);
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
