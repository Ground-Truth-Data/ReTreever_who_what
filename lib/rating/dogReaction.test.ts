import { describe, expect, it } from "vitest";
import {
	BLINK_FROM,
	BREATH_BLINK,
	BREATH_BLINK_SHEET,
	BREATH_SHEET,
	DOG_SHEETS,
	breathPlays,
	entranceFor,
	idleBlinkFor,
	idleFor,
	reactionFor,
	standingFor,
	watchingFor,
} from "./dogReaction";

const counts: Record<string, number> = {
	"dog-entrance": 49, "dog-turn-opaque": 60, "dog-blink-opaque": 12, "dog-exit-opaque": 77,
	"dog-turn-partial": 163, "dog-blink-partial": 12, "dog-to-neutral-partial": 14,
	"dog-turn-open": 28, "dog-turn-transparent": 71, "dog-pant-transparent": 8,
	"dog-to-neutral-transparent": 23, "dog-pant-neutral": 10, "dog-pant-blink": 12, "dog-still-blink": 10,
};
const clips = Object.fromEntries(Object.entries(counts).map(([c, frameCount]) => [c, { frameCount }]));
const sheet = (clip: string) => DOG_SHEETS[clip].ticks;

describe("entranceFor and standingFor", () => {
	it("walk on once, then stand in a loop; nothing when the manifest lacks the clip", () => {
		expect(entranceFor(clips)).toEqual([{ clip: "dog-entrance", loop: false, frames: sheet("dog-entrance") }]);
		expect(standingFor(clips)).toEqual([{ clip: "dog-still-blink", loop: true }]);
		expect(entranceFor({})).toEqual([]);
		expect(standingFor({})).toEqual([]);
	});

	it("plays a clip re-exported with another frame count as drawn, not on a sheet timed for the old one", () => {
		expect(entranceFor({ "dog-entrance": { frameCount: 50 } })).toEqual([{ clip: "dog-entrance", loop: false }]);
	});
});

describe("DOG_SHEETS", () => {
	it("puts the entrance's head snap and the transparent turn's pop on twos, and drops the duplicate frame 14", () => {
		const entrance = sheet("dog-entrance");
		expect(entrance).toHaveLength(53);
		expect(entrance).not.toContain(14);
		expect(entrance.slice(27, 37)).toEqual([29, 29, 30, 30, 31, 31, 32, 32, 33, 33]);
		expect(sheet("dog-turn-transparent").slice(46, 51)).toEqual([47, 48, 48, 49, 49]);
	});

	it("ends the transparent turn on 69 and starts its pant on 3, the closer pair", () => {
		expect(sheet("dog-turn-transparent").at(-1)).toBe(69);
		expect(sheet("dog-pant-transparent")[0]).toBe(3);
	});

	it("caps turn-partial's still holds at 7 ticks and puts the sad turn's head swing on twos", () => {
		const partial = sheet("dog-turn-partial");
		expect(partial.filter((f) => f >= 62 && f <= 75)).toHaveLength(7);
		expect(partial.filter((f) => f >= 116 && f <= 141)).toHaveLength(7);
		expect(sheet("dog-turn-opaque").slice(12, 18)).toEqual([13, 14, 14, 15, 15, 16]);
	});

	it("names only frames the clip has, ending on its last unless the next clip joins earlier", () => {
		for (const [clip, { of, ticks }] of Object.entries(DOG_SHEETS)) {
			expect(of, clip).toBe(counts[clip]);
			expect(Math.min(...ticks), clip).toBeGreaterThanOrEqual(1);
			expect(Math.max(...ticks), clip).toBeLessThanOrEqual(of);
			if (clip !== "dog-turn-transparent") expect(ticks.at(-1), clip).toBe(of);
		}
	});
});

describe("watchingFor", () => {
	it("holds the entrance's last frame, the profile every turn starts from", () => {
		expect(watchingFor(clips)).toEqual([{ clip: "dog-entrance", loop: false, hold: true }]);
	});

	it("falls back to the standing loop when there was no entrance", () => {
		expect(watchingFor({ "dog-still-blink": {} })).toEqual([{ clip: "dog-still-blink", loop: true }]);
	});
});

describe("reactionFor", () => {
	it("turns, then pants a while and settles, in the order the art joins", () => {
		expect(reactionFor("partial", clips)).toEqual([
			{ clip: "dog-turn-partial", loop: false, frames: sheet("dog-turn-partial") },
			{ clip: "dog-to-neutral-partial", loop: false },
		]);
		expect(reactionFor("transparent", clips)).toEqual([
			{ clip: "dog-turn-transparent", loop: false, frames: sheet("dog-turn-transparent") },
			{ clip: "dog-pant-transparent", loop: false, frames: sheet("dog-pant-transparent") },
			{ clip: "dog-to-neutral-transparent", loop: false, frames: sheet("dog-to-neutral-transparent") },
		]);
		expect(reactionFor("open", clips).map((s) => s.clip)).toEqual(["dog-turn-open"]);
		expect(reactionFor("opaque", clips).map((s) => s.clip)).toEqual(["dog-turn-opaque"]);
	});

	it("turns an unscored dog with the plain open turn, and nothing after it", () => {
		expect(reactionFor(null, clips)).toEqual([{ clip: "dog-turn-open", loop: false }]);
		expect(reactionFor(null, {})).toEqual([]);
	});

	it("plays nothing the manifest lacks", () => {
		expect(reactionFor("partial", { "dog-turn-partial": {} }).map((s) => s.clip)).toEqual(["dog-turn-partial"]);
		expect(reactionFor("open", {})).toEqual([]);
	});
});

describe("idleFor", () => {
	it("breathes on the neutral face every state but the sad one settles to", () => {
		for (const state of ["transparent", "partial", "open", null] as const) {
			expect(idleFor(reactionFor(state, clips), clips, 5), String(state)).toEqual({
				clip: "dog-pant-neutral",
				loop: 5,
				frames: BREATH_SHEET,
			});
		}
		expect(idleFor(reactionFor("opaque", clips), clips, 5)).toBeNull();
	});

	it("never breathes out of a face the breath is not drawn from", () => {
		expect(idleFor([{ clip: "dog-turn-partial", loop: false }], clips, 5)).toBeNull();
		expect(idleFor(reactionFor("open", clips), { "dog-pant-neutral": {} }, 5)).toBeNull();
	});

	it("takes the breath at 0.625 s, ends each on frame 10, and lets the blink join only from its edges", () => {
		expect(BREATH_SHEET).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 9, 10]);
		expect(BLINK_FROM).toEqual([9, 10, 1, 2]);
		expect(BREATH_BLINK).toBe("dog-pant-blink");
	});

	it("blinks at the breath's pace, so the mouth keeps its rhythm through the blink", () => {
		expect(BREATH_BLINK_SHEET).toHaveLength(18);
		expect(BREATH_BLINK_SHEET.slice(0, 6)).toEqual([1, 1, 2, 3, 3, 4]);
		expect(BREATH_BLINK_SHEET.at(-1)).toBe(12);
	});

	it("draws 4 to 8 breaths between blinks", () => {
		expect(breathPlays(() => 0)).toBe(4);
		expect(breathPlays(() => 0.9999)).toBe(8);
	});
});

describe("idleBlinkFor", () => {
	it("blinks a state that settles to neutral with the neutral blink, never the face it left", () => {
		expect(idleBlinkFor("partial", clips)).not.toBe("dog-blink-partial");
		expect(idleBlinkFor("partial", clips)).toBe("dog-still-blink");
		expect(idleBlinkFor("transparent", clips)).toBe("dog-still-blink");
	});

	it("keeps the sad dog's own blink and falls back to the shared still blink", () => {
		expect(idleBlinkFor("opaque", clips)).toBe("dog-blink-opaque");
		expect(idleBlinkFor("open", clips)).toBe("dog-still-blink");
		expect(idleBlinkFor(null, clips)).toBe("dog-still-blink");
		expect(idleBlinkFor("open", {})).toBeNull();
	});
});
