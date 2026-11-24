import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import WeedsTally from "./WeedsTally.svelte";
import type { ScoreTally } from "../whoWhatTypes";

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
	org: { projects: 367, mean: 64.8, claimed: null, planted: 0, undisclosed: null, reviewed: false, ratio: null },
};

const draw = (props: Partial<{ litIndex: number; landed: boolean; traceHref: string; name: string }> = {}) =>
	render(WeedsTally, { props: { tally: org, litIndex: 0, visible: true, ...props } }).body.replace(/<!--[\s\S]*?-->/g, "");
const card = (html: string) => html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
const strip = (html: string) => {
	const end = html.indexOf('class="trace-end');
	return html.slice(html.indexOf('class="tally strip'), end === -1 ? undefined : end);
};

describe("the tally card", () => {
	it("shows every figure on the first table: six in the stack, every table's line with its points", () => {
		const html = card(draw());
		expect(html.match(/<li class="(possible|filled|share|claim|place|rating)\b/g)).toHaveLength(6);
		expect(html).not.toMatch(/class="[^"]*\bwait\b/);
		expect(html).toContain("85.7");
		// Every table reads its figure before it is dug: the last one included.
		expect(html).toContain("2,956 / 4,222");
		expect(html).not.toContain(">·<");
	});

	it("lights one line, the table in hand", () => {
		for (const litIndex of [0, 3]) {
			const html = card(draw({ litIndex }));
			expect(html.match(/<li class="[^"]*\blit\b/g)).toHaveLength(1);
		}
	});

	it("is finished on the last table, and not before", () => {
		expect(draw({ litIndex: 6 })).toMatch(/<aside class="tally corner[^"]*\bdone\b/);
		expect(draw({ litIndex: 5 })).not.toMatch(/<aside class="tally corner[^"]*\bdone\b/);
		expect(draw({ litIndex: 6, landed: false })).not.toMatch(/<aside class="tally corner[^"]*\bdone\b/);
	});

	it("keeps the trace link out of the card and the strip, once after them", () => {
		const html = draw({ traceHref: "/who/a-a/score" });
		expect(card(html)).not.toMatch(/<a\s/);
		expect(strip(html)).not.toMatch(/<a\s/);
		expect(html.match(/href="\/who\/a-a\/score"/g)).toHaveLength(1);
		expect(html.indexOf('href="/who/a-a/score"')).toBeGreaterThan(html.indexOf('class="tally strip'));
	});

	it("offers the summary to print or download only when it can name the record, in the card and the strip", () => {
		expect(draw()).not.toContain('class="export');
		const html = draw({ name: "Plant for the Planet" });
		expect(card(html).match(/<button/g)).toHaveLength(2);
		expect(html.match(/class="export/g)).toHaveLength(2);
	});
});
