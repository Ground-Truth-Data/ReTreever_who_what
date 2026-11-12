import { describe, expect, it } from "vitest";
import { RATING_STATES, RATING_STATE_FLOORS, ratingState } from "./ratingState";

describe("ratingState", () => {
	it("cuts the percentile into equal quarters, each floor inclusive", () => {
		expect(RATING_STATE_FLOORS).toEqual({ opaque: 0, partial: 25, open: 50, transparent: 75 });
		expect(ratingState(0)).toBe("opaque");
		expect(ratingState(24.9)).toBe("opaque");
		expect(ratingState(25)).toBe("partial");
		expect(ratingState(49.9)).toBe("partial");
		expect(ratingState(50)).toBe("open");
		expect(ratingState(74.9)).toBe("open");
		expect(ratingState(75)).toBe("transparent");
		expect(ratingState(100)).toBe("transparent");
	});

	it("is null for an unscored record", () => {
		expect(ratingState(null)).toBeNull();
		expect(ratingState(Number.NaN)).toBeNull();
	});

	it("gives every state a band of the same width, in order", () => {
		const floors = RATING_STATES.map((s) => RATING_STATE_FLOORS[s]);
		const widths = [...floors.slice(1), 100].map((top, i) => top - floors[i]);
		expect(new Set(widths).size).toBe(1);
	});
});
