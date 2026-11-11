import { describe, expect, it } from "vitest";
import { toTransparencyScore } from "./whoWhatTypes";

describe("toTransparencyScore", () => {
	it("is 0–100 to one decimal, null when unscored", () => {
		expect(toTransparencyScore("0.883928571428571")).toBe(88.4);
		expect(toTransparencyScore(0)).toBe(0);
		expect(toTransparencyScore(null)).toBeNull();
		expect(toTransparencyScore(undefined)).toBeNull();
		expect(toTransparencyScore("x")).toBeNull();
	});

	it("never leaves 0–100, whatever the stored score", () => {
		expect(toTransparencyScore(2.5)).toBe(100);
		expect(toTransparencyScore("524.22")).toBe(100);
		expect(toTransparencyScore(-0.1)).toBe(0);
	});
});
