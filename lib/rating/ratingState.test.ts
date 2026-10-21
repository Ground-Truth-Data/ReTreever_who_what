import { describe, expect, it } from "vitest";
import { RATING_STATES, RATING_STATE_CEILINGS, ratingState } from "./ratingState";

describe("ratingState", () => {
	it("maps each boundary to the right state, inclusive both ends", () => {
		expect(ratingState(0)).toBe("opaque");
		expect(ratingState(29)).toBe("opaque");
		expect(ratingState(29.4)).toBe("opaque");
		expect(ratingState(29.5)).toBe("partial");
		expect(ratingState(30)).toBe("partial");
		expect(ratingState(59)).toBe("partial");
		expect(ratingState(60)).toBe("open");
		expect(ratingState(85)).toBe("open");
		expect(ratingState(86)).toBe("transparent");
		expect(ratingState(100)).toBe("transparent");
	});

	it("is null for an unscored record", () => {
		expect(ratingState(null)).toBeNull();
		expect(ratingState(Number.NaN)).toBeNull();
	});

	it("covers 0–100 in order, the last state closing at 100", () => {
		const ceilings = RATING_STATES.map((s) => RATING_STATE_CEILINGS[s]);
		expect([...ceilings].sort((a, b) => a - b)).toEqual(ceilings);
		expect(ceilings.at(-1)).toBe(100);
	});
});
