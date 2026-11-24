import { describe, expect, it } from "vitest";
import type { ScoreTally } from "../whoWhatTypes";
import { summaryCsv, summaryFileName, summaryRows } from "./summaryExport";

const org: ScoreTally = {
	kind: "org",
	scored: true,
	rating: 85.7,
	score: 64.8,
	pointsScored: 58126,
	pointsAvailable: 89712,
	planted: 0,
	measure: null,
	tables: [
		{ table: "projects", awarded: 1368, available: 1835 },
		{ table: "crop", awarded: 0, available: 6973 },
		{ table: "planting", awarded: 4058, available: 5872 },
		{ table: "land", awarded: 45364, available: 54090 },
		{ table: "polymorphic", awarded: 512, available: 5138 },
		{ table: "stakeholders", awarded: 3868, available: 11582 },
		{ table: "sources", awarded: 2956, available: 4222 },
	],
	place: { rank: 2, of: 7, group: "marketplace_ish", peers: [23.3, 24.5, 35.5, 40.9, 41.3, 64.8, 70.6] },
	scoreRunId: "run-1",
	scoredAt: "2026-11-23T13:33:43.001Z",
	reconciled: true,
	org: { projects: 367, mean: 64.8, claimed: null, planted: 0, undisclosed: null, reviewed: true, ratio: 0.42 },
};
const input = { name: 'Plant for the Planet, "PftP"', url: "https://retreever.org/who/a-a", tally: org, counts: { possible: 240, filled: 96 } };

describe("the summary export", () => {
	const rows = summaryRows(input);

	it("is four columns on every row: a header, the record, the six figures, one line per table", () => {
		for (const r of rows) expect(r).toHaveLength(4);
		expect(rows).toHaveLength(1 + 3 + 6 + 7);
	});

	it("names the record, its page and the score run's day", () => {
		expect(rows[1][2]).toBe(input.name);
		expect(rows[2][2]).toBe(input.url);
		expect(rows[3][2]).toBe("2026-11-23");
	});

	it("carries the six figures as plain numbers, each beside what it is out of", () => {
		expect(rows.slice(4, 10).map((r) => [r[2], r[3]])).toEqual([
			["240", ""],
			["96", "240"],
			["40.0", "100"],
			["0.42", ""],
			["2", "7"],
			["85.7", "100"],
		]);
	});

	it("carries each table's points earned and on offer, in strip order", () => {
		expect(rows.slice(10).map((r) => [r[2], r[3]])).toEqual(org.tables.map((t) => [String(t.awarded), String(t.available)]));
	});

	it("leaves a figure the record lacks empty: a project's claim, a missing count, an unranked place", () => {
		const bare = summaryRows({ ...input, counts: null, tally: { ...org, kind: "project", place: null, scoredAt: null } });
		expect(bare[3][2]).toBe("");
		expect(bare.slice(4, 10).map((r) => r[2])).toEqual(["", "", "", "", "", "85.7"]);
	});

	it("an org without a reviewed claim multiplies by 1", () => {
		const rows = summaryRows({ ...input, tally: { ...org, org: { ...org.org!, reviewed: false } } });
		expect(rows[7][2]).toBe("1");
	});

	it("quotes what needs quoting and ends rows with CRLF", () => {
		const csv = summaryCsv(input);
		const lines = csv.split("\r\n");
		expect(lines).toHaveLength(rows.length + 1);
		expect(lines[lines.length - 1]).toBe("");
		expect(lines[1]).toContain('"Plant for the Planet, ""PftP"""');
	});

	it("never carries a record row: only the summary", () => {
		expect(summaryCsv(input)).not.toMatch(/projectKey|siteName/);
	});

	it("names the file after the record", () => {
		expect(summaryFileName(input.name)).toMatch(/^[a-z0-9-]+\.csv$/);
		expect(summaryFileName(input.name)).toContain("plant-for-the-planet");
	});
});
