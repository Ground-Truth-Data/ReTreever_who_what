import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import WeedsCount from "./WeedsCount.svelte";

const html = (body: string) => body.replace(/<!--[\s\S]*?-->/g, "");

describe("the weeds panel's count", () => {
	it("draws a count's number in the numerals and keeps the whole sentence for a screen reader", () => {
		const out = html(render(WeedsCount, { props: { count: 22, text: "22 rows" } }).body);
		expect(out).toContain('class="sr');
		expect(out).toMatch(/>22 rows</);
		expect(out).toMatch(/class="noun[^"]*"> rows</);
		expect(out).toContain('alt=""');
	});

	it("shows a sentence that does not lead with its number as type only", () => {
		const out = html(render(WeedsCount, { props: { count: 3, text: "Showing 3" } }).body);
		expect(out).not.toContain('alt=""');
		expect(out).toMatch(/class="noun[^"]*">Showing 3</);
	});
});
