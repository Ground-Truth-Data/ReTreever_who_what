import { describe, expect, it } from "vitest";
import { normalizeQuery, resolveSearchKey } from "./searchResolve";
import type { SearchListItem } from "./searchTypes";

const ITEMS: SearchListItem[] = [
	{ key: "c-12tree", name: "12Tree" },
	// Keys are already percent-encoded; returned verbatim, never re-encoded.
	{ key: "a-active%20trees", name: "ACTIVE TREES" },
	{ key: "x-green-1", name: "Green Land Group" },
	{ key: "x-green-2", name: "Green Land Group" },
	{ key: "y-tree-aid", name: "Tree Aid International" },
	{ key: "z-tree-aid", name: "Tree Aid" },
];

describe("normalizeQuery", () => {
	it("folds case, trims, and collapses internal whitespace runs", () => {
		expect(normalizeQuery("  A  b ")).toBe("a b");
	});
});

describe("resolveSearchKey", () => {
	it("matches a name regardless of case and stray whitespace", () => {
		expect(resolveSearchKey("  active   trees ", ITEMS)).toBe(
			"a-active%20trees",
		);
	});

	it("returns the stored key verbatim, without re-encoding it", () => {
		expect(resolveSearchKey("ACTIVE TREES", ITEMS)).toBe("a-active%20trees");
	});

	it("resolves a substring when exactly one row contains it", () => {
		expect(resolveSearchKey("aid international", ITEMS)).toBe("y-tree-aid");
	});

	it("refuses an ambiguous substring rather than guessing a row", () => {
		expect(resolveSearchKey("tree", ITEMS)).toBeNull();
	});

	it("returns null when nothing matches", () => {
		expect(resolveSearchKey("zzz", ITEMS)).toBeNull();
	});

	it("returns null for a blank query", () => {
		expect(resolveSearchKey("   ", ITEMS)).toBeNull();
	});

	it("prefers an exact match over a substring one", () => {
		expect(resolveSearchKey("tree aid", ITEMS)).toBe("z-tree-aid");
	});

	it("falls back to the first row when two share a name", () => {
		expect(resolveSearchKey("green land group", ITEMS)).toBe("x-green-1");
	});

	it("uses the picked row to break a duplicate-name tie", () => {
		expect(resolveSearchKey("Green Land Group", ITEMS, ITEMS[3])).toBe(
			"x-green-2",
		);
	});

	it("ignores a selection the query has since been edited away from", () => {
		expect(resolveSearchKey("12Tree", ITEMS, ITEMS[3])).toBe("c-12tree");
	});

	it("returns null against an empty list rather than throwing", () => {
		expect(resolveSearchKey("12Tree", [])).toBeNull();
	});
});
