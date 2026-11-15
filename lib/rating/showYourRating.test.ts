import { describe, expect, it } from "vitest";
import { badgeSnippet } from "./ShowYourRating.svelte";

describe("the badge snippet", () => {
	const snippet = badgeSnippet(
		"https://www.retreever.org/who/p-a%20b",
		"https://www.retreever.org/who/p-a%20b/badge.png?size=large&theme=dark",
		{ width: 320, height: 108 },
		'A & "B": data transparency rating on ReTreever',
	);

	it("is a plain link around a plain image, never a script", () => {
		expect(snippet).toMatch(/^<a href="https:\/\/www\.retreever\.org\/who\/p-a%20b"><img [^>]+><\/a>$/);
		expect(snippet).not.toMatch(/<script|on\w+=|javascript:/i);
	});

	it("escapes what it carries into attributes", () => {
		expect(snippet).toContain('src="https://www.retreever.org/who/p-a%20b/badge.png?size=large&amp;theme=dark"');
		expect(snippet).toContain('alt="A &amp; &quot;B&quot;: data transparency rating on ReTreever"');
		expect(snippet).toContain('width="320" height="108"');
	});
});
