import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import WeedsTable from "./WeedsTable.svelte";
import type { WeedsColumn, WeedsRow } from "../whoWhatTypes";

const columns: WeedsColumn[] = [
	{ key: "url", label: "URL", kind: "link" },
	{ key: "sourceDesc", label: "Description", kind: "text" },
	{ key: "linkDeadAt", label: "Link dead", kind: "dead" },
];
const draw = (row: WeedsRow) => render(WeedsTable, { props: { columns, rows: [row] } }).body.replace(/<!--[\s\S]*?-->/g, "");

describe("the weeds sources table", () => {
	it("a dead link is its host as text, no anchor, with the day it was checked", () => {
		const html = draw({ url: "https://www.gone.example/a", sourceDesc: "Project website", linkDeadAt: "2026-11-10T17:10:44.938Z" });
		expect(html).not.toContain("<a");
		expect(html).toContain("gone.example");
		expect(html).toContain("link dead · checked 2026/11/10");
	});

	it("a live or unchecked link is a link, and the dead column is never drawn", () => {
		const html = draw({ url: "https://ok.example/a", sourceDesc: null, linkDeadAt: null });
		expect(html).toContain('href="https://ok.example/a"');
		expect(html).not.toContain("link dead");
		expect(html).not.toMatch(/<th[^>]*>[^<]*Link dead/);
		expect(html.match(/<th[ >]/g)).toHaveLength(1);
		expect(html).toContain("Not published on any row: Description");
	});

	it("a column is judged published on every row, not on the filtered ones", () => {
		const all = [
			{ url: "https://ok.example/a", sourceDesc: null, linkDeadAt: null },
			{ url: null, sourceDesc: "Annual report", linkDeadAt: null },
		];
		const html = render(WeedsTable, { props: { columns, rows: [all[0]], all } }).body;
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
		expect(html).not.toContain("Not published");
	});

	it("a link that is not http or https is text, never an anchor", () => {
		for (const url of ["javascript:alert(1)", "data:text/html,hi", "/who/acme"]) {
			const html = draw({ url, sourceDesc: null, linkDeadAt: null });
			expect(html).not.toContain("<a");
			expect(html).not.toContain("href=");
		}
		expect(draw({ url: "javascript:alert(1)", sourceDesc: null, linkDeadAt: null })).toContain("javascript:alert(1)");
	});
});

describe("the weeds land table", () => {
	const land: WeedsColumn[] = [
		{ key: "landDesc", label: "Site", kind: "site", aside: "landName" },
		{ key: "landName", label: "Site id", kind: "aside" },
		{ key: "preparation", label: "Status", kind: "text" },
		{ key: "hectares", label: "Hectares", kind: "number" },
	];
	const rows = [
		{ landDesc: "ACTIVE TREES Planting Site Sakabusolo", landName: "site_gpNSH8W7R3Un64j", preparation: "planting", hectares: null },
		{ landDesc: null, landName: "site_dEbhrbeGJdimr0Z", preparation: "planting", hectares: null },
	];
	const html = render(WeedsTable, { props: { columns: land, rows } }).body.replace(/<!--[\s\S]*?-->/g, "");

	it("leads with the description; an unnamed site shows its id in small type, a named one none", () => {
		expect(html).toContain("ACTIVE TREES Planting Site Sakabusolo");
		expect(html).not.toContain("site_gpNSH8W7R3Un64j");
		expect(html).toMatch(/Unnamed site<small class="site-id[^"]*">site_dEbhrbeGJdimr0Z<\/small>/);
		expect(html.match(/site_/g)).toHaveLength(1);
	});

	it("draws no empty column and lists it under the table", () => {
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
		expect(html).toContain("Not published on any row: Hectares");
	});
});
