// @vitest-environment happy-dom
// The cue's rules: the budget (once a day, five days, blocked storage), the
// ready checks, the clock that only a decision restarts, the cancel, and the
// help sticker's press that no watcher sees.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	armLesson,
	budgetAllows,
	CANCELS,
	devHook,
	isReady,
	MAX_DAYS,
	readBudget,
	RECHECK_MS,
	spend,
	STILL_MS,
	storeKey,
	today,
	watchInput,
	writeBudget,
} from "./lessons.svelte";

function memory(seed: Record<string, string> = {}) {
	const m = new Map(Object.entries(seed));
	return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), map: m };
}
const blocked = {
	getItem: () => {
		throw new Error("blocked");
	},
	setItem: () => {
		throw new Error("blocked");
	},
};
const move = (x: number, y: number) => Object.assign(new Event("pointermove"), { clientX: x, clientY: y });

describe("the budget", () => {
	it("plays at most once a day and on five distinct days, then never", () => {
		expect(budgetAllows(null, "2026-10-31")).toBe(true);
		expect(budgetAllows({ days: [] }, "2026-10-31")).toBe(true);
		expect(budgetAllows({ days: ["2026-10-31"] }, "2026-10-31")).toBe(false);
		expect(budgetAllows({ days: ["2026-10-30"] }, "2026-10-31")).toBe(true);
		const five = { days: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"] };
		expect(five.days).toHaveLength(MAX_DAYS);
		expect(budgetAllows(five, "2026-10-31")).toBe(false);
		expect(spend(null, "2026-10-31")).toEqual({ days: ["2026-10-31"] });
		expect(spend({ days: ["2026-10-31"] }, "2026-10-31")).toEqual({ days: ["2026-10-31"] });
		expect(spend({ days: ["2026-10-30"] }, "2026-10-31")).toEqual({ days: ["2026-10-30", "2026-10-31"] });
	});

	it("reads and writes rtvr.lesson.<name>, and a blocked or broken store reads as nothing", () => {
		const m = memory({ [storeKey("rating")]: '{"days":["2026-10-30",7]}', [storeKey("search")]: "not json" });
		expect(readBudget("rating", m)).toEqual({ days: ["2026-10-30"] });
		expect(readBudget("search", m)).toBeNull();
		expect(writeBudget("search", { days: ["2026-10-31"] }, m)).toBe(true);
		expect(m.map.get("rtvr.lesson.search")).toBe('{"days":["2026-10-31"]}');
		expect(readBudget("search", blocked)).toBeNull();
		expect(writeBudget("search", { days: [] }, blocked)).toBe(false);
		expect(readBudget("search", null)).toBeNull();
		expect(devHook(memory({ rtvrLesson: "always" }))).toBe("always");
		expect(devHook(memory({ rtvrLesson: "never" }))).toBe("never");
		expect(devHook(memory({ rtvrLesson: "maybe" }))).toBeNull();
		expect(devHook(blocked)).toBeNull();
		expect(today(new Date(2026, 9, 31, 23, 59))).toBe("2026-10-31");
	});
});

describe("ready", () => {
	const ready = { reducedMotion: false, curtainHref: null, visibility: "visible", focusWithin: false, dropdownOpen: false, pageReady: true };
	it("needs every fact at once", () => {
		expect(isReady(ready)).toBe(true);
		expect(isReady({ ...ready, reducedMotion: true })).toBe(false);
		expect(isReady({ ...ready, curtainHref: "/who/x" })).toBe(false);
		expect(isReady({ ...ready, visibility: "hidden" })).toBe(false);
		expect(isReady({ ...ready, focusWithin: true })).toBe(false);
		expect(isReady({ ...ready, dropdownOpen: true })).toBe(false);
		expect(isReady({ ...ready, pageReady: false })).toBe(false);
	});
});

describe("armLesson", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function arm(over: Partial<Parameters<typeof armLesson>[1]> = {}, store: ReturnType<typeof memory> | typeof blocked | null = memory()) {
		const target = new EventTarget();
		const deps = {
			ready: vi.fn(() => true),
			play: vi.fn(() => new Promise<void>(() => {})),
			cancel: vi.fn(),
			target,
			store,
			day: () => "2026-10-31",
			...over,
		};
		const teardown = armLesson("search", deps);
		return { deps, target, teardown, store };
	}

	it("plays the cue once after six seconds without a decision, spends the day first, and never twice in a page load", async () => {
		const { deps, target, store } = arm();
		vi.advanceTimersByTime(STILL_MS - 1);
		expect(deps.play).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(deps.play).toHaveBeenCalledOnce();
		expect((store as ReturnType<typeof memory>).map.get("rtvr.lesson.search")).toBe('{"days":["2026-10-31"]}');
		await Promise.resolve();
		target.dispatchEvent(new Event("scroll"));
		vi.advanceTimersByTime(STILL_MS * 3);
		expect(deps.play).toHaveBeenCalledOnce();
	});

	it("a pointerdown restarts the clock; a pointermove, however far, does not", () => {
		const { deps, target } = arm();
		vi.advanceTimersByTime(STILL_MS - 500);
		target.dispatchEvent(new Event("pointerdown"));
		vi.advanceTimersByTime(STILL_MS - 500);
		expect(deps.play).not.toHaveBeenCalled();
		target.dispatchEvent(move(100, 100));
		target.dispatchEvent(move(400, 300));
		vi.advanceTimersByTime(500);
		expect(deps.play).toHaveBeenCalledOnce();
	});

	it("a second landing the same day plays no cue", () => {
		const store = memory();
		const first = arm({}, store);
		vi.advanceTimersByTime(STILL_MS);
		expect(first.deps.play).toHaveBeenCalledOnce();
		first.teardown();
		const second = arm({}, store);
		vi.advanceTimersByTime(STILL_MS * 3);
		expect(second.deps.play).not.toHaveBeenCalled();
		second.teardown();
	});

	it("the help sticker's own press reaches no watcher: neither the clock nor the cancel", () => {
		const sticker = document.createElement("button");
		sticker.className = "help-sticker";
		const inner = document.createElement("span");
		sticker.append(inner);
		document.body.append(sticker);
		const { deps } = arm({ target: window });
		vi.advanceTimersByTime(STILL_MS - 500);
		inner.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		vi.advanceTimersByTime(500);
		expect(deps.play).toHaveBeenCalledOnce();
		inner.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		inner.dispatchEvent(new Event("keydown", { bubbles: true }));
		expect(deps.cancel).not.toHaveBeenCalled();
		const seen = vi.fn();
		const unwatch = watchInput(window, CANCELS, seen);
		sticker.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(seen).not.toHaveBeenCalled();
		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(seen).toHaveBeenCalledOnce();
		unwatch();
		sticker.remove();
	});

	it("re-checks a busy page every two seconds and plays when it clears", () => {
		let ready = false;
		const { deps } = arm({ ready: vi.fn(() => ready) });
		vi.advanceTimersByTime(STILL_MS + RECHECK_MS * 2);
		expect(deps.play).not.toHaveBeenCalled();
		ready = true;
		vi.advanceTimersByTime(RECHECK_MS);
		expect(deps.play).toHaveBeenCalledOnce();
	});

	it("a decision during the cue cancels it; a scroll or a pointermove does not", () => {
		const { deps, target } = arm();
		vi.advanceTimersByTime(STILL_MS);
		target.dispatchEvent(new Event("scroll"));
		target.dispatchEvent(move(500, 500));
		expect(deps.cancel).not.toHaveBeenCalled();
		target.dispatchEvent(new Event("wheel"));
		expect(deps.cancel).toHaveBeenCalledOnce();
		target.dispatchEvent(new Event("keydown"));
		expect(deps.cancel).toHaveBeenCalledOnce();
	});

	it("a spent day, or five days, means no play; blocked storage means once per page load; the dev hook overrides", () => {
		const spent = arm({}, memory({ "rtvr.lesson.search": '{"days":["2026-10-31"]}' }));
		vi.advanceTimersByTime(STILL_MS * 2);
		expect(spent.deps.play).not.toHaveBeenCalled();
		spent.teardown();

		const five = arm({}, memory({ "rtvr.lesson.search": '{"days":["2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05"]}' }));
		vi.advanceTimersByTime(STILL_MS * 2);
		expect(five.deps.play).not.toHaveBeenCalled();
		five.teardown();

		const dark = arm({}, blocked);
		vi.advanceTimersByTime(STILL_MS);
		expect(dark.deps.play).toHaveBeenCalledOnce();
		dark.teardown();

		const always = arm({}, memory({ rtvrLesson: "always", "rtvr.lesson.search": '{"days":["2026-10-31"]}' }));
		vi.advanceTimersByTime(STILL_MS);
		expect(always.deps.play).toHaveBeenCalledOnce();
		always.teardown();

		const never = arm({}, memory({ rtvrLesson: "never" }));
		vi.advanceTimersByTime(STILL_MS * 2);
		expect(never.deps.play).not.toHaveBeenCalled();
		never.teardown();
	});

	it("teardown clears the clock and cancels a lesson in flight", () => {
		const { deps, teardown } = arm();
		vi.advanceTimersByTime(STILL_MS);
		teardown();
		expect(deps.cancel).toHaveBeenCalledOnce();
		const idle = arm();
		idle.teardown();
		vi.advanceTimersByTime(STILL_MS * 2);
		expect(idle.deps.play).not.toHaveBeenCalled();
		expect(idle.deps.cancel).not.toHaveBeenCalled();
	});
});
