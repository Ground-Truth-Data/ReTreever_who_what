import { describe, expect, it } from "vitest";
import { WEEDS_TABLES, type ScoreTally, type TallyLine } from "../whoWhatTypes";
import {
	TABLE_LABELS,
	claimFactor,
	lineFill,
	lineValue,
	placeLine,
	runningPoints,
	stackRows,
	sumsThrough,
	tallyDone,
	tween,
} from "./tallyMath";

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
const project: ScoreTally = {
	kind: "project",
	scored: true,
	rating: 91.8,
	score: 91.8,
	pointsScored: 514,
	pointsAvailable: 560,
	planted: 20,
	measure: { kind: "trees", value: 20 },
	tables: ACTIVE,
	place: { rank: 2, of: 5, group: null, peers: [10, 40, 60, 91.8, 95] },
	scoreRunId: "run-1",
	scoredAt: "2026-11-23T13:33:43.001Z",
	reconciled: true,
	attributes: null,
};
// P-TREE ADOPTION UGANDA's shape: 22 projects' mean 64.4, no reviewed claim, 13th of 46 developers at 73.9.
const org: ScoreTally = {
	...project,
	kind: "org",
	rating: 73.9,
	score: 64.4,
	org: { projects: 22, mean: 64.4, claimed: null, planted: 16630, undisclosed: null, reviewed: false, ratio: null },
	place: { rank: 13, of: 46, group: "developer_ish", peers: Array.from({ length: 46 }, (_, i) => i * 2) },
};

describe("runningPoints", () => {
	it("counts the tables' running sums before the last tab, the stored totals on it", () => {
		expect(runningPoints(project, 0)).toMatchObject({ scored: 4, available: 5 });
		expect(runningPoints(project, 5)).toMatchObject({ scored: 504, available: 548 });
		expect(runningPoints(project, 6)).toEqual({ scored: 514, available: 560 });
		expect(runningPoints({ ...project, pointsScored: null, pointsAvailable: null }, 6)).toEqual({ scored: 513, available: 560 });
	});
});

describe("the stack", () => {
	const counts = { possible: 240, filled: 96 };
	const keys = ["possible", "filled", "share", "claim", "place", "rating"];

	it("holds six figures in the walk's order, every one filled from the start", () => {
		const rows = stackRows({ ...org, attributes: counts });
		expect(rows.map((r) => r.key)).toEqual(keys);
		for (const r of rows) expect(r.value).not.toBe("—");
		const [possible, filled, share, claim, place, rating] = rows.map((r) => r.value);
		expect([possible, filled, rating]).toEqual(["240", "96", "73.9"]);
		expect(share).toMatch(/^40\.0\s?%$/);
		expect(claim).toMatch(/1$/);
		expect(place).toMatch(/^13\D+46$/);
	});

	it("gives a project no claim step and an unranked record no place", () => {
		expect(stackRows({ ...project, attributes: counts }).find((r) => r.key === "claim")?.value).toBe("—");
		expect(stackRows({ ...org, place: null, attributes: counts }).find((r) => r.key === "place")?.value).toBe("—");
	});

	it("has no share with nothing on offer", () => {
		expect(stackRows({ ...org, attributes: { possible: 0, filled: 0 } }).find((r) => r.key === "share")?.value).toBe("—");
	});

	it("multiplies by a reviewed claim only", () => {
		expect(claimFactor(org)).toBe("× 1");
		expect(claimFactor({ ...org, org: { ...org.org!, reviewed: false, ratio: 0.5 } })).toBe("× 1");
		expect(claimFactor({ ...org, org: { ...org.org!, reviewed: true, ratio: 0.42 } })).toBe("× 0.42");
		expect(claimFactor({ ...org, org: { ...org.org!, reviewed: true, ratio: 1.3 } })).toBe("× 1");
	});
});

describe("tallyDone", () => {
	it("is finished on the last table once the hero's number has landed", () => {
		expect(tallyDone(org, 6, true)).toBe(true);
		expect(tallyDone(org, 5, true)).toBe(false);
		expect(tallyDone(org, 6, false)).toBe(false);
	});
});

describe("the peers", () => {
	it("names the group as the trace page does", () => {
		expect(placeLine(org)).toEqual({ among: "Among the 46 developers", ranked: "Ranked among the 46 developers", place: "Place 13 of 46", short: "Place 13 of 46 developers" });
		expect(placeLine({ ...org, place: { ...org.place!, group: "all" } })?.among).toBe("Among all 46 organizations");
		expect(placeLine(project)?.among).toBe("Among all 5 projects");
		expect(placeLine({ ...org, place: null })).toBeNull();
	});
});

describe("a table's line", () => {
	it("reads its final figure, or counts up to it while lit", () => {
		expect(lineValue(ACTIVE[0])).toEqual({ awarded: 4, available: 5, fill: 0.8 });
		expect(lineValue(ACTIVE[0], 0)).toEqual({ awarded: 0, available: 5, fill: 0 });
		expect(lineValue(ACTIVE[0], 0.5)).toEqual({ awarded: 2, available: 5, fill: 0.4 });
	});

	it("is a dash with nothing on offer, and 0 of what it offers with no record", () => {
		expect(lineValue(ACTIVE[1])).toBe("–");
		expect(lineFill(ACTIVE[1])).toBeNull();
		expect(lineValue({ table: "planting", awarded: 0, available: 16 })).toEqual({ awarded: 0, available: 16, fill: 0 });
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

describe("the words", () => {
	it("name every table once", () => {
		for (const t of WEEDS_TABLES) {
			expect(TABLE_LABELS[t]).toMatch(/^[A-Z]/);
		}
	});
});
