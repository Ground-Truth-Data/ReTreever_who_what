import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import WeedsTable from "./WeedsTable.svelte";
import type { WeedsAttribute } from "../whoWhatTypes";

const attr = (field: string, more: Partial<WeedsAttribute>): WeedsAttribute => ({
	field,
	label: "ww_rating_column_unit",
	kind: "text",
	pointsAwarded: 0,
	pointsAvailable: 367,
	filled: 0,
	records: 367,
	example: null,
	...more,
});

const attributes = [
	attr("PlantingTable.plantedQty", { label: "ww_rating_column_trees_planted", kind: "number", example: 15000, filled: 331, pointsAwarded: 993, pointsAvailable: 1101 }),
	attr("PlantingTable.unitType", {}),
	attr("PlantingTable.pricePerUnit", { label: "ww_rating_column_price_per_unit", kind: "money", example: 10.63, unit: "EUR", filled: 367, pointsAwarded: 734, pointsAvailable: 734 }),
	attr("LandTable.latitude", { label: "ww_rating_attr_latitude", withheld: true, filled: 4 }),
	attr("SourceTable.url", { label: "ww_rating_column_link", kind: "link", example: "javascript:alert(1)", filled: 1 }),
	attr("ProjectTable.projectEndDt", { label: "ww_rating_column_ends", kind: "date", pointsAwarded: null, pointsAvailable: null }),
];

const html = (props: { attributes: WeedsAttribute[]; line?: number | null }) => render(WeedsTable, { props }).body.replace(/<!--[\s\S]*?-->/g, "");
const rowOf = (out: string, field: string) => out.match(new RegExp(`<tr[^>]*data-field="${field.replace(".", "\\.")}"[\\s\\S]*?</tr>`))?.[0] ?? "";

describe("the weeds table, one row per attribute", () => {
	it("draws every attribute as a row, with its value and points, before any scroll", () => {
		const out = html({ attributes });
		expect(out.match(/<tr[^>]*data-field=/g)).toHaveLength(attributes.length);
		expect(rowOf(out, "PlantingTable.plantedQty")).toContain("15,000");
		expect(rowOf(out, "PlantingTable.plantedQty")).toMatch(/993[\s\S]*1,101/);
		expect(rowOf(out, "PlantingTable.pricePerUnit")).toContain("€10.63");
		// Nothing waits on the scroll to be seen.
		expect(out).not.toMatch(/class="[^"]*digging/);
		expect(out).not.toMatch(/opacity:\s*0/);
	});

	it("an attribute no record fills is still a row: an empty value and none of its points", () => {
		const row = rowOf(html({ attributes }), "PlantingTable.unitType");
		expect(row).toMatch(/class="shown[^"]*">\s*—/);
		expect(row).toMatch(/class="share[^"]*">[^<]*\b0\b[^<]*367/);
		expect(row).toMatch(/aria-label="[^"]*\b0\b[^"]*367"/);
	});

	it("a withheld value is never drawn, only that it is published", () => {
		const row = rowOf(html({ attributes }), "LandTable.latitude");
		expect(row).toContain('class="withheld');
		expect(row).toMatch(/class="share[^"]*">[^<]*\b4\b[^<]*367/);
	});

	it("a link that is not http or https is text, never an anchor", () => {
		const row = rowOf(html({ attributes }), "SourceTable.url");
		expect(row).not.toContain("<a");
		expect(row).toContain("javascript:alert(1)");
		const safe = rowOf(html({ attributes: [attr("SourceTable.url", { kind: "link", example: "https://www.ok.example/a", filled: 1 })] }), "SourceTable.url");
		expect(safe).toContain('href="https://www.ok.example/a"');
		expect(safe).toContain("ok.example");
	});

	it("points a run never broke down read as a dash", () => {
		expect(rowOf(html({ attributes }), "ProjectTable.projectEndDt")).toMatch(/class="points[^"]*">\s*—/);
	});

	it("no row is active before the reader reaches the table", () => {
		expect(html({ attributes, line: null })).not.toMatch(/<tr[^>]*class="[^"]*\bactive/);
	});
});
