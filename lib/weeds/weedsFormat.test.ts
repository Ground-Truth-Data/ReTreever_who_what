import { describe, expect, it, vi } from "vitest";
import { EMPTY, cellText, filterRows, formatCell, formatMoney, formatWeedsDate, fullCount, linkLabel, shortCount, splitPublished } from "./weedsFormat";
import type { WeedsColumn } from "../whoWhatTypes";

const lang = vi.hoisted(() => ({ locale: "en" }));
vi.mock(import("$parent/src/lib/paraglide/runtime"), async (actual) => ({ ...(await actual()), getLocale: () => lang.locale as never }));

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
		expect(formatCell(55.7, "score")).toBe("55.7/100");
		expect(formatCell("https://www.maearth.com/api/files/x?variant=web", "link")).toBe("maearth.com");
		expect(linkLabel("no scheme")).toBe("no scheme");
	});
});

describe("money, points and sites", () => {
	it("every dollar is a plain $; € and £ keep their sign; any other currency reads its code", () => {
		expect(formatMoney(8, "EUR")).toBe("€8.00");
		expect(formatMoney(8, "GBP")).toBe("£8.00");
		for (const code of ["USD", "CAD", "AUD", "NZD"]) expect(formatMoney(8, code)).toBe("$8.00");
		expect(formatMoney(8, "BRL")).toBe("8.00 BRL");
		expect(formatMoney(1200, "KES")).toBe("1,200.00 KES");
		expect(formatMoney(8, "not a code")).toBe("8.00 not a code");
		expect(formatMoney(8, null)).toBe("8.00");
	});

	it("a cell reads with its aside", () => {
		const price: WeedsColumn = { key: "price", label: "Price per unit", kind: "money", aside: "currency" };
		expect(cellText({ price: 8, currency: "EUR" }, price)).toBe("€8.00");
		expect(cellText({ price: null, currency: "EUR" }, price)).toBe(EMPTY);
		const points: WeedsColumn = { key: "scored", label: "Points", kind: "points", aside: "available" };
		expect(cellText({ scored: 514, available: 1560 }, points)).toBe("514 of 1,560");
		const site: WeedsColumn = { key: "desc", label: "Site", kind: "site", aside: "id" };
		expect(cellText({ desc: "Ndaragwa", id: "site_1" }, site)).toBe("Ndaragwa");
		expect(cellText({ desc: null, id: "site_1" }, site)).toBe("Unnamed site");
		expect(cellText({ desc: null, id: null }, site)).toBe(EMPTY);
	});

	it("a column no row publishes is listed, unless it is optional; asides are never either", () => {
		const columns: WeedsColumn[] = [
			{ key: "a", label: "A", kind: "text" },
			{ key: "b", label: "B", kind: "number" },
			{ key: "u", label: "Unit", kind: "text", optional: true },
			{ key: "c", label: "Currency", kind: "aside" },
		];
		const { shown, missing } = splitPublished(columns, [{ a: "x", b: null, u: null, c: null }, { a: null, b: "", u: null, c: "EUR" }]);
		expect(shown.map((c) => c.key)).toEqual(["a"]);
		expect(missing.map((c) => c.key)).toEqual(["b"]);
	});
});

describe("the weeds bar's filter", () => {
	const columns: WeedsColumn[] = [
		{ key: "name", label: "Name", kind: "text" },
		{ key: "when", label: "When", kind: "date" },
		{ key: "url", label: "URL", kind: "link" },
		{ key: "n", label: "N", kind: "number" },
		{ key: "projectKey", label: "Key", kind: "key" },
	];
	const rows = [
		{ name: "Teak", when: "2024-07-12T00:00:00.000Z", url: "https://ok.example/a/teak-plot", n: 1200, projectKey: "m-teak-1" },
		{ name: "Mangrove", when: null, url: null, n: null, projectKey: "m-mangrove-2" },
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

	it("a key column is not searched: a visitor cannot see it", () => {
		expect(filterRows(rows, columns, "m-teak")).toEqual([]);
		expect(filterRows(rows, columns, "mangrove").map((r) => r.name)).toEqual(["Mangrove"]);
	});

	it("a site matches on its id, a price on its sign", () => {
		const cols: WeedsColumn[] = [
			{ key: "desc", label: "Site", kind: "site", aside: "id" },
			{ key: "id", label: "Site id", kind: "aside" },
			{ key: "price", label: "Price per unit", kind: "money", aside: "cur" },
		];
		const land = [{ desc: null, id: "site_dEbh", price: 8, cur: "EUR" }];
		expect(filterRows(land, cols, "dEbh")).toHaveLength(1);
		expect(filterRows(land, cols, "€8")).toHaveLength(1);
		expect(filterRows(land, cols, "EUR")).toHaveLength(0);
	});

	it("a link matches on its host and on its full URL", () => {
		expect(filterRows(rows, columns, "ok.example")).toHaveLength(1);
		expect(filterRows(rows, columns, "teak-plot")).toHaveLength(1);
	});
});

describe("the tally's counts", () => {
	const inLocale = (locale: string, f: () => void) => {
		lang.locale = locale;
		try {
			f();
		} finally {
			lang.locale = "en";
		}
	};

	it("keeps four digits whole and grouped, and shortens five or more to one decimal", () => {
		expect(shortCount(5165)).toBe("5,165");
		expect(shortCount(9999.6)).toBe("10K");
		expect(shortCount(226619)).toBe("226.6K");
		expect(shortCount(382268)).toBe("382.3K");
		expect(shortCount(15454)).toBe("15.5K");
		expect(shortCount(1_234_567)).toBe("1.2M");
		expect(fullCount(226619)).toBe("226,619");
	});

	it("speaks the reader's language", () => {
		inLocale("fr", () => {
			expect(shortCount(226619).replace(/\s/g, " ")).toBe("226,6 k");
			expect(fullCount(226619).replace(/\s/g, " ")).toBe("226 619");
		});
		inLocale("es", () => expect(shortCount(226619).replace(/\s/g, " ")).toBe("226,6 mil"));
		inLocale("pt-BR", () => expect(shortCount(226619).replace(/\s/g, " ")).toBe("226,6 mil"));
	});
});
