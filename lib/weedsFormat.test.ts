import { describe, expect, it } from "vitest";
import { EMPTY, filterRows, formatCell, formatWeedsDate, linkLabel } from "./weedsFormat";
import type { WeedsColumn } from "./whoWhatTypes";

describe("weeds cells", () => {
	it("an empty cell is a dash, whatever its kind", () => {
		for (const kind of ["text", "number", "date", "link", "score"] as const) {
			expect(formatCell(null, kind)).toBe(EMPTY);
			expect(formatCell(undefined, kind)).toBe(EMPTY);
			expect(formatCell("", kind)).toBe(EMPTY);
		}
	});

	it("dates are Y/M/D with no padding, read in UTC", () => {
		expect(formatWeedsDate("2024-07-12T00:00:00.000Z")).toBe("2024/7/12");
		expect(formatWeedsDate("2021-09-07T23:30:00.000Z")).toBe("2021/9/7");
		expect(formatWeedsDate("not a date")).toBe("not a date");
	});

	it("numbers, scores and links", () => {
		expect(formatCell(1234.5678, "number")).toBe("1,234.57");
		expect(formatCell(12, "number")).toBe("12");
		expect(formatCell(55.7, "score")).toBe("55.7%");
		expect(formatCell("https://www.maearth.com/api/files/x?variant=web", "link")).toBe("maearth.com");
		expect(linkLabel("no scheme")).toBe("no scheme");
	});
});

describe("the weeds bar's filter", () => {
	const columns: WeedsColumn[] = [
		{ key: "name", label: "Name", kind: "text" },
		{ key: "when", label: "When", kind: "date" },
		{ key: "url", label: "URL", kind: "link" },
		{ key: "n", label: "N", kind: "number" },
	];
	const rows = [
		{ name: "Teak", when: "2024-07-12T00:00:00.000Z", url: "https://ok.example/a/teak-plot", n: 1200 },
		{ name: "Mangrove", when: null, url: null, n: null },
	];

	it("empty or blank text keeps every row", () => {
		expect(filterRows(rows, columns, "")).toBe(rows);
		expect(filterRows(rows, columns, "   ")).toBe(rows);
	});

	it("matches any cell, case-insensitively, as the cell is shown", () => {
		expect(filterRows(rows, columns, "MANG").map((r) => r.name)).toEqual(["Mangrove"]);
		expect(filterRows(rows, columns, "2024/7")).toHaveLength(1);
		expect(filterRows(rows, columns, "1,200")).toHaveLength(1);
		expect(filterRows(rows, columns, "nothing here")).toEqual([]);
	});

	it("a link matches on its host and on its full URL", () => {
		expect(filterRows(rows, columns, "ok.example")).toHaveLength(1);
		expect(filterRows(rows, columns, "teak-plot")).toHaveLength(1);
	});
});
