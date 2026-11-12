import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import RatingFeedback from "./RatingFeedback.svelte";

const about = () => ({ kind: "org" as const, key: "o-acme", name: "Acme", rating: 73.3, tab: "planting" as const });

describe("the rating page's feedback line", () => {
	it("is one closed line: no form, no box, nothing sent until it is pressed", () => {
		const html = render(RatingFeedback, { props: { href: "/api/feedback", about } }).body;
		expect(html).toContain("Something wrong or missing in this rating? Tell us.");
		expect(html).not.toContain("<form");
		expect(html).not.toContain("<textarea");
		expect(html).not.toMatch(/role="(dialog|alert)"/);
	});
});
