import { describe, expect, it } from "vitest";
import { entranceFor, idleBlinkFor, reactionFor, standingFor } from "./dogReaction";

const clips = Object.fromEntries(
	[
		"dog-entrance", "dog-turn-opaque", "dog-blink-opaque", "dog-exit-opaque",
		"dog-turn-partial", "dog-blink-partial", "dog-to-neutral-partial",
		"dog-turn-open", "dog-turn-transparent", "dog-pant-transparent",
		"dog-to-neutral-transparent", "dog-pant-neutral", "dog-pant-blink", "dog-still-blink",
	].map((c) => [c, {}]),
);

describe("entranceFor and standingFor", () => {
	it("walk on once, then stand in a loop; nothing when the manifest lacks the clip", () => {
		expect(entranceFor(clips)).toEqual([{ clip: "dog-entrance", loop: false }]);
		expect(standingFor(clips)).toEqual([{ clip: "dog-still-blink", loop: true }]);
		expect(entranceFor({})).toEqual([]);
		expect(standingFor({})).toEqual([]);
	});
});

describe("reactionFor", () => {
	it("turns, then settles or pants when the state has those clips", () => {
		expect(reactionFor("partial", clips).map((s) => s.clip)).toEqual([
			"dog-turn-partial", "dog-to-neutral-partial",
		]);
		expect(reactionFor("transparent", clips)).toEqual([
			{ clip: "dog-turn-transparent", loop: false },
			{ clip: "dog-to-neutral-transparent", loop: false },
			{ clip: "dog-pant-transparent", loop: true },
		]);
		expect(reactionFor("open", clips).map((s) => s.clip)).toEqual(["dog-turn-open"]);
		expect(reactionFor("opaque", clips).map((s) => s.clip)).toEqual(["dog-turn-opaque"]);
	});

	it("plays nothing the manifest lacks", () => {
		expect(reactionFor("partial", { "dog-turn-partial": {} }).map((s) => s.clip)).toEqual(["dog-turn-partial"]);
		expect(reactionFor("open", {})).toEqual([]);
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
