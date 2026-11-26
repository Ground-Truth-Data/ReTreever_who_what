import { describe, expect, it } from "vitest";
import { formatTransparencyScore } from "../whoWhatTypes";
import { heroGhost, heroScore, heroScoreOutOf } from "./heroScore";

describe("the hero's number", () => {
	it("is the score rounded to a whole number", () => {
		expect(heroScore(72.4)).toBe("72");
		expect(heroScore(72.5)).toBe("73");
		expect(heroScore(99.6)).toBe("100");
		expect(heroScore(100)).toBe("100");
		expect(heroScore(0.4)).toBe("0");
		expect(heroScore(0)).toBe("0");
	});

	it("is read aloud as the number it shows", () => {
		const spoken = heroScoreOutOf(72.4);
		expect(spoken).toMatch(/\b72\b/);
		expect(spoken).not.toMatch(/72[.,]4/);
	});

	it("is held by zeros as many as its digits", () => {
		expect(heroGhost(7.2)).toBe("0");
		expect(heroGhost(72.4)).toBe("00");
		expect(heroGhost(99.6)).toBe("000");
	});

	it("leaves every other score its decimal", () => {
		expect(formatTransparencyScore(72.4)).toBe("72.4");
		expect(formatTransparencyScore(99.6)).toBe("99.6");
	});
});
