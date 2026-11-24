import { describe, expect, it, vi } from "vitest";
import { EMPTY, attributeText, cellText, filterAttributes, filterRows, formatCell, formatMoney, formatWeedsDate, fullCount, linkLabel, shortCount, splitPublished, symbolCount } from "./weedsFormat";
import type { WeedsAttribute, WeedsColumn } from "../whoWhatTypes";

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

describe("money and points", () => {
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
		const species: WeedsColumn = { key: "species", label: "Species", kind: "names" };
		const names = [{ name: "Teak", scientific: "Tectona grandis" }, { name: "Ghost tree", scientific: null }];
		expect(cellText({ species: names }, species)).toBe("Teak Tectona grandis, Ghost tree");
		expect(cellText({ species: null }, species)).toBe(EMPTY);
	});

	it("a column the host says no row fills is listed, unless it is optional; asides are never either", () => {
		const columns: WeedsColumn[] = [
			{ key: "a", label: "A", kind: "text" },
			{ key: "b", label: "B", kind: "number" },
			{ key: "u", label: "Unit", kind: "text", optional: true },
			{ key: "c", label: "Currency", kind: "aside" },
		];
		const { shown, missing } = splitPublished(columns, ["a", "c"]);
		expect(shown.map((c) => c.key)).toEqual(["a"]);
		expect(missing.map((c) => c.key)).toEqual(["b"]);
	});

	it("a column filled only past the rows sent is shown, not listed", () => {
		const columns: WeedsColumn[] = [
			{ key: "survivalRatePct", label: "Surviving (%)", kind: "number" },
			{ key: "reviews", label: "Reviews", kind: "text" },
		];
		const { shown, missing } = splitPublished(columns, ["reviews"]);
		expect(shown.map((c) => c.key)).toEqual(["reviews"]);
		expect(missing.map((c) => c.key)).toEqual(["survivalRatePct"]);
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

	it("a price matches on its sign", () => {
		const cols: WeedsColumn[] = [
			{ key: "price", label: "Price per unit", kind: "money", aside: "cur" },
			{ key: "cur", label: "Currency", kind: "aside" },
		];
		const plantings = [{ price: 8, cur: "EUR" }];
		expect(filterRows(plantings, cols, "€8")).toHaveLength(1);
		expect(filterRows(plantings, cols, "EUR")).toHaveLength(0);
	});

	it("a link matches on its host and on its full URL", () => {
		expect(filterRows(rows, columns, "ok.example")).toHaveLength(1);
		expect(filterRows(rows, columns, "teak-plot")).toHaveLength(1);
	});
});

describe("an attribute's value", () => {
	const attr = (more: Partial<WeedsAttribute>): WeedsAttribute => ({
		field: "PlantingTable.x",
		label: "x",
		kind: "text",
		pointsAwarded: 0,
		pointsAvailable: 0,
		filled: 0,
		records: 0,
		example: null,
		...more,
	});

	it("reads by its kind, with the unit beside it", () => {
		expect(attributeText(attr({ kind: "money", example: 8, unit: "EUR" }))).toBe("€8.00");
		expect(attributeText(attr({ kind: "money", example: 8, unit: "USD" }))).toBe("$8.00");
		expect(attributeText(attr({ kind: "number", example: 1200, unit: "Tree" }))).toBe("1,200 Tree");
		expect(attributeText(attr({ kind: "date", example: "2013-03-01T00:00:00.000Z" }))).toBe("2013/3/1");
		expect(attributeText(attr({ kind: "link", example: "https://www.ok.example/a" }))).toBe("ok.example");
		expect(attributeText(attr({ kind: "names", example: [{ name: "Teak", scientific: "Tectona grandis" }] }))).toBe("Teak Tectona grandis");
	});

	it("an attribute no record fills reads as a dash", () => {
		expect(attributeText(attr({ example: null }))).toBe(EMPTY);
		expect(attributeText(attr({ kind: "money", example: null, unit: null }))).toBe(EMPTY);
	});

	it("the bar keeps the attributes whose name or value holds the text", () => {
		const list = [attr({ field: "a", label: "Currency", example: "EUR" }), attr({ field: "b", label: "Unit", example: null }), attr({ field: "c", label: "Planted on", kind: "date", example: "2013-03-01T00:00:00.000Z" })];
		const name = (a: WeedsAttribute) => a.label;
		expect(filterAttributes(list, name, "")).toBe(list);
		expect(filterAttributes(list, name, "unit").map((a) => a.field)).toEqual(["b"]);
		expect(filterAttributes(list, name, "eur").map((a) => a.field)).toEqual(["a"]);
		expect(filterAttributes(list, name, "2013/3").map((a) => a.field)).toEqual(["c"]);
		expect(filterAttributes(list, name, "—")).toEqual([]);
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

	it("rounds a sticker's figure to K, M, B and T", () => {
		expect(symbolCount(3800)).toBe("3.8K");
		expect(symbolCount(16630)).toBe("16.6K");
		expect(symbolCount(999_950)).toBe("1M");
		expect(symbolCount(1_234_567)).toBe("1.2M");
		expect(symbolCount(4_000_000_000)).toBe("4B");
		expect(symbolCount(2_500_000_000_000)).toBe("2.5T");
		for (const l of ["fr", "es", "pt-BR"]) inLocale(l, () => expect(symbolCount(3800)).toBe("3,8K"));
		inLocale("es", () => expect(symbolCount(1_234_567)).toBe("1,2M"));
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
