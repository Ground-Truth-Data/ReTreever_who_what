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
		expect(html.match(/<th[ >]/g)).toHaveLength(2);
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
