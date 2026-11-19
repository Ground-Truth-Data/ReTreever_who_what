import { describe, expect, it } from "vitest";
import { WEEDS_TABLES, type ScoreTally, type TallyLine } from "../whoWhatTypes";
import {
	TABLE_LABELS,
	barFill,
	claimLine,
	ladderValue,
	landingBeats,
	ownBar,
	peerBars,
	peersLit,
	placeLine,
	stepFigure,
	sumsThrough,
	tallySteps,
	tallyTargets,
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
	reconciled: true,
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

describe("tallyTargets", () => {
	it("counts the tables' running sums before the last tab", () => {
		expect(tallyTargets(project, 0)).toEqual({ scored: 4, available: 5, big: 80 });
		expect(tallyTargets(project, 5)).toEqual({ scored: 504, available: 548, big: 92 });
	});

	it("lands the last tab on the stored totals and the score despite drift", () => {
		expect(sumsThrough(ACTIVE, 6)).toEqual({ scored: 513, available: 560, pct: 91.6 });
		expect(tallyTargets(project, 6)).toEqual({ scored: 514, available: 560, big: 91.8 });
	});

	it("follows an org's running points too, and settles the last tab on its projects' mean", () => {
		expect(tallyTargets(org, 0)).toEqual({ scored: 4, available: 5, big: 80 });
		expect(tallyTargets(org, 6)).toEqual({ scored: 514, available: 560, big: 64.4 });
	});

	it("falls back to the sums where nothing is stored", () => {
		const bare: ScoreTally = { ...project, score: null, rating: null, pointsScored: null, pointsAvailable: null };
		expect(tallyTargets(bare, 6)).toEqual({ scored: 513, available: 560, big: 91.6 });
	});
});

describe("the walk to the rating", () => {
	it("takes an org through its claims and a project straight to its peers", () => {
		expect(tallySteps(org)).toEqual(["points", "claims", "place"]);
		expect(tallySteps(project)).toEqual(["points", "place"]);
		expect(tallySteps({ ...org, place: null })).toEqual(["points", "claims"]);
		expect(tallySteps({ ...project, rating: null })).toEqual(["points"]);
	});

	it("settles each step on its figure and ends on the hero's number", () => {
		const claimed: ScoreTally = { ...org, score: 27, org: { ...org.org!, reviewed: true, ratio: 0.42 } };
		expect(tallySteps(claimed).map((s) => stepFigure(claimed, s))).toEqual([64.4, 27, 73.9]);
		expect(landingBeats(org).map((b) => b.to)).toEqual([64.4, 64.4, 73.9]);
		expect(landingBeats(org).map((b) => b.peers)).toEqual([false, false, true]);
		expect(landingBeats(project).map((b) => b.to)).toEqual([91.8, 91.8]);
	});
});

describe("claimLine", () => {
	it("takes nothing off without a reviewed claim", () => {
		expect(claimLine(org)).toEqual({ words: "No reviewed claim yet", factor: "× 1", leaves: null });
		expect(claimLine({ ...org, org: { ...org.org!, reviewed: false, ratio: 0.5 } }).factor).toBe("× 1");
	});

	it("divides planted by claimed and says the score it leaves", () => {
		const claimed: ScoreTally = { ...org, score: 27, org: { ...org.org!, reviewed: true, ratio: 0.42 } };
		expect(claimLine(claimed)).toEqual({ words: "Planted ÷ claimed", factor: "× 0.42", leaves: "Leaves 27.0" });
		expect(claimLine({ ...claimed, org: { ...claimed.org!, ratio: 1 } }).factor).toBe("× 1");
	});
});

describe("the peers", () => {
	it("names the group as the trace page does", () => {
		expect(placeLine(org)).toEqual({ among: "Among the 46 developers", ranked: "Ranked among the 46 developers", place: "Place 13 of 46", short: "Place 13 of 46 developers" });
		expect(placeLine({ ...org, place: { ...org.place!, group: "all" } })?.among).toBe("Among all 46 organizations");
		expect(placeLine(project)?.among).toBe("Among all 5 projects");
		expect(placeLine({ ...org, place: null })).toBeNull();
	});

	it("finds its own bar among ascending peers, scaled onto quantiles", () => {
		expect(ownBar(project.place!)).toBe(3);
		expect(ownBar(org.place!)).toBe(33);
		expect(ownBar({ rank: 1, of: 1000, peers: Array(120).fill(0) })).toBe(119);
		expect(ownBar({ rank: 1000, of: 1000, peers: Array(120).fill(0) })).toBe(0);
		expect(ownBar({ rank: 1, of: 1, peers: [50] })).toBe(0);
	});

	it("lights the bars below its own from the lowest, never its own", () => {
		expect(peersLit(33, 0)).toBe(0);
		expect(peersLit(33, 0.5)).toBe(17);
		expect(peersLit(33, 1)).toBe(33);
		expect(peersLit(0, 1)).toBe(0);
	});

	it("draws every peer inside the strip, a zero as a sliver", () => {
		const bars = peerBars([0, 50, 100]);
		expect(bars.map((b) => b.h)).toEqual([1, 16, 32]);
		const last = bars[bars.length - 1];
		expect(last.x + last.w).toBeCloseTo(240);
		expect(peerBars([])).toEqual([]);
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
		}
	});
});
