import { describe, expect, it } from "vitest";
import { idleBlinkFor, sequenceFor, stateFor } from "./dogReaction";

const states = { opaque: [0, 29], partial: [30, 59], open: [60, 85], transparent: [86, 100] } as Record<
	string,
	[number, number]
>;
const clips = Object.fromEntries(
	[
		"dog-entrance", "dog-turn-opaque", "dog-blink-opaque", "dog-exit-opaque",
		"dog-turn-partial", "dog-blink-partial", "dog-to-neutral-partial",
		"dog-turn-open", "dog-turn-transparent", "dog-pant-transparent",
		"dog-to-neutral-transparent", "dog-pant-neutral", "dog-pant-blink", "dog-still-blink",
	].map((c) => [c, {}]),
);

describe("stateFor", () => {
	it("maps each boundary to the right state, inclusive both ends", () => {
		expect(stateFor(0, states)).toBe("opaque");
		expect(stateFor(29, states)).toBe("opaque");
		expect(stateFor(29.4, states)).toBe("opaque");
		expect(stateFor(29.5, states)).toBe("partial");
		expect(stateFor(30, states)).toBe("partial");
		expect(stateFor(59, states)).toBe("partial");
		expect(stateFor(60, states)).toBe("open");
		expect(stateFor(85, states)).toBe("open");
		expect(stateFor(86, states)).toBe("transparent");
		expect(stateFor(100, states)).toBe("transparent");
	});

	it("is null for an unscored record", () => {
		expect(stateFor(null, states)).toBeNull();
		expect(stateFor(Number.NaN, states)).toBeNull();
	});
});

describe("sequenceFor", () => {
	it("walks on, turns, then settles or pants when the state has those clips", () => {
		expect(sequenceFor("partial", clips).map((s) => s.clip)).toEqual([
			"dog-entrance", "dog-turn-partial", "dog-to-neutral-partial",
		]);
		expect(sequenceFor("transparent", clips)).toEqual([
			{ clip: "dog-entrance", loop: false },
			{ clip: "dog-turn-transparent", loop: false },
			{ clip: "dog-to-neutral-transparent", loop: false },
			{ clip: "dog-pant-transparent", loop: true },
		]);
		expect(sequenceFor("open", clips).map((s) => s.clip)).toEqual(["dog-entrance", "dog-turn-open"]);
		expect(sequenceFor("opaque", clips).map((s) => s.clip)).toEqual(["dog-entrance", "dog-turn-opaque"]);
	});

	it("only idles when unscored, and plays nothing the manifest lacks", () => {
		expect(sequenceFor(null, clips)).toEqual([{ clip: "dog-still-blink", loop: true }]);
		expect(sequenceFor("partial", { "dog-turn-partial": {} }).map((s) => s.clip)).toEqual(["dog-turn-partial"]);
		expect(sequenceFor(null, {})).toEqual([]);
	});
});

describe("idleBlinkFor", () => {
	it("prefers the state's own blink and falls back to the shared still blink", () => {
		expect(idleBlinkFor("opaque", clips)).toBe("dog-blink-opaque");
		expect(idleBlinkFor("open", clips)).toBe("dog-still-blink");
		expect(idleBlinkFor(null, clips)).toBe("dog-still-blink");
		expect(idleBlinkFor("open", {})).toBeNull();
	});
});
