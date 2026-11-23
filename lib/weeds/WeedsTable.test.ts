import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import WeedsTable from "./WeedsTable.svelte";
import type { WeedsColumn, WeedsRow } from "../whoWhatTypes";

const columns: WeedsColumn[] = [
	{ key: "url", label: "URL", kind: "link" },
	{ key: "sourceDesc", label: "Description", kind: "text" },
	{ key: "linkDeadAt", label: "Link dead", kind: "dead", aside: "linkAliveAt" },
	{ key: "linkAliveAt", label: "Last alive", kind: "aside" },
];
/** What the host answers: the drawn columns this one row fills. */
const filledBy = (row: WeedsRow) => columns.map((c) => c.key).filter((k) => row[k] != null && row[k] !== "");
const draw = (row: WeedsRow) => render(WeedsTable, { props: { columns, rows: [row], filled: filledBy(row) } }).body.replace(/<!--[\s\S]*?-->/g, "");

describe("the weeds sources table", () => {
	it("a dead link is its host as text, no anchor, with the day it was checked", () => {
		const html = draw({ url: "https://www.gone.example/a", sourceDesc: "Project website", linkDeadAt: "2026-11-10T17:10:44.938Z" });
		expect(html).not.toContain("<a");
		expect(html).toContain("gone.example");
		expect(html).toContain("link dead · checked 2026/11/10");
		expect(html).not.toContain("last alive");
	});

	it("a dead link the check once saw alive names that day too", () => {
		const html = draw({ url: "https://www.gone.example/a", sourceDesc: null, linkDeadAt: "2026-11-10T17:10:44.938Z", linkAliveAt: "2026-10-28T09:00:00.000Z" });
		expect(html).toContain("link dead · checked 2026/11/10 · last alive 2026/10/28");
		expect(html).not.toMatch(/<th[^>]*>[^<]*Last alive/);
	});

	it("a live or unchecked link is a link, and the dead column is never drawn", () => {
		const html = draw({ url: "https://ok.example/a", sourceDesc: null, linkDeadAt: null });
		expect(html).toContain('href="https://ok.example/a"');
		expect(html).not.toContain("link dead");
		expect(html).not.toMatch(/<th[^>]*>[^<]*Link dead/);
		expect(html.match(/<th[ >]/g)).toHaveLength(1);
		expect(html).not.toMatch(/<th[^>]*>[^<]*Description/);
	});

	it("a column is judged published as the host says, not on the rows drawn", () => {
		const shown = { url: "https://ok.example/a", sourceDesc: null, linkDeadAt: null };
		const html = render(WeedsTable, { props: { columns, rows: [shown], filled: ["url", "sourceDesc"] } }).body;
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
		expect(html).toMatch(/<th[^>]*>[^<]*Description/);
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
	const html = render(WeedsTable, { props: { columns: land, rows, filled: ["landDesc", "preparation"] } }).body.replace(/<!--[\s\S]*?-->/g, "");

	it("leads with the description; an unnamed site shows its id in small type, a named one none", () => {
		expect(html).toContain("ACTIVE TREES Planting Site Sakabusolo");
		expect(html).not.toContain("site_gpNSH8W7R3Un64j");
		expect(html).toMatch(/Unnamed site<small class="site-id[^"]*">site_dEbhrbeGJdimr0Z<\/small>/);
		expect(html.match(/site_/g)).toHaveLength(1);
	});

	it("names a species with its scientific name after it in small type", () => {
		const crop: WeedsColumn[] = [{ key: "species", label: "Species", kind: "names" }];
		const species = [{ name: "Teak", scientific: "Tectona grandis" }, { name: "Ghost tree", scientific: null }];
		const drawn = render(WeedsTable, { props: { columns: crop, rows: [{ species }], filled: ["species"] } }).body.replace(/<!--[\s\S]*?-->/g, "");
		expect(drawn).toMatch(/Teak<small class="sci[^"]*">Tectona grandis<\/small>, Ghost tree<\/td>/);
	});

	// The fields it leaves out are listed by the panel's footer (NeverPublished), not by the table.
	it("draws no empty column", () => {
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
		expect(html).not.toMatch(/<th[^>]*>[^<]*Hectares/);
	});
});

describe("a table that publishes nothing", () => {
	const impact: WeedsColumn[] = [
		{ key: "project", label: "Project", kind: "text" },
		{ key: "survivalRate", label: "Surviving (%)", kind: "number" },
		{ key: "reviews", label: "Reviews", kind: "text" },
		{ key: "linkDeadAt", label: "Link dead", kind: "dead" },
	];

	it("still draws its row, every field an empty cell, when asked for blanks", () => {
		const html = render(WeedsTable, { props: { columns: impact, rows: [{ project: "Elm", survivalRate: null, reviews: null }], filled: ["project"], blanks: true } }).body;
		expect(html.match(/<th[ >]/g)).toHaveLength(3);
		expect(html.match(/<tr[ >]/g)).toHaveLength(2);
		expect(html).toContain("Elm");
	});

	it("draws its row with no project column to lead it", () => {
		const html = render(WeedsTable, { props: { columns: impact.slice(1), rows: [{ survivalRate: null, reviews: null }], filled: [], blanks: true } }).body;
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
		expect(html.match(/<td[ >]/g)).toHaveLength(2);
	});
});
