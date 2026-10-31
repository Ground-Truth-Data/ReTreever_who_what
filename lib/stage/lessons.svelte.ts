// When the teaching hand plays on a who/what page: after the reader sits
// still, within a budget of days, while the page is ready, the cue that
// points at the help sticker; and the cancel the first decision brings.
// The hand, the cue and the lessons are LessonHand's.
import type { WeedsTable } from "../whoWhatTypes";

export type LessonName = "search" | "rating";
export type LessonStore = { days: string[] };

export const STILL_MS = 6000;
export const RECHECK_MS = 2000;
export const MAX_DAYS = 5;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const storeKey = (name: LessonName) => `rtvr.lesson.${name}`;

/** The local calendar day, so "once a day" follows the reader's clock. */
export function today(d = new Date()): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function storage(): StorageLike | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

/** The stored days; null when storage is blocked or holds nothing readable. */
export function readBudget(name: LessonName, store: StorageLike | null = storage()): LessonStore | null {
	try {
		const raw = store?.getItem(storeKey(name));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<LessonStore>;
		return Array.isArray(parsed.days) ? { days: parsed.days.filter((d) => typeof d === "string") } : null;
	} catch {
		return null;
	}
}

export function writeBudget(name: LessonName, value: LessonStore, store: StorageLike | null = storage()): boolean {
	try {
		store?.setItem(storeKey(name), JSON.stringify(value));
		return store !== null;
	} catch {
		return false;
	}
}

/** Once a day, on at most MAX_DAYS distinct days; with nothing stored the answer is yes. */
export function budgetAllows(store: LessonStore | null, day: string): boolean {
	if (!store) return true;
	return !store.days.includes(day) && store.days.length < MAX_DAYS;
}

export function spend(store: LessonStore | null, day: string): LessonStore {
	const days = store?.days ?? [];
	return days.includes(day) ? { days } : { days: [...days, day] };
}

export type DevHook = "always" | "never" | null;

/** `localStorage.rtvrLesson`: "always" ignores the budget, "never" disarms. */
export function devHook(store: StorageLike | null = storage()): DevHook {
	try {
		const v = store?.getItem("rtvrLesson");
		return v === "always" || v === "never" ? v : null;
	} catch {
		return null;
	}
}

export type ReadyFacts = {
	reducedMotion: boolean;
	curtainHref: string | null;
	visibility: string;
	focusWithin: boolean;
	dropdownOpen: boolean;
	pageReady: boolean;
};

export function isReady(f: ReadyFacts): boolean {
	return !f.reducedMotion && f.curtainHref === null && f.visibility === "visible" && !f.focusWithin && !f.dropdownOpen && f.pageReady;
}

/** A decision: what restarts the clock. A pointermove is a reader looking, not deciding. */
export const DECISIONS = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;
/** What cancels the hand mid-play; a scroll stays out because the rating lesson scrolls itself. */
export const CANCELS = ["pointerdown", "touchstart", "keydown", "wheel"] as const;

/** The listed inputs on `target`, except one aimed at the help sticker: that press is the sticker's own. */
export function watchInput(target: EventTarget, types: readonly string[], onInput: (e: Event) => void): () => void {
	const handle = (e: Event) => {
		const el = e.target as { closest?: (s: string) => unknown } | null;
		if (typeof el?.closest === "function" && el.closest(".help-sticker")) return;
		onInput(e);
	};
	// The page's own scroll does not bubble up from elements, so the window's is the reader's.
	for (const type of types) target.addEventListener(type, handle, { passive: true, capture: type !== "scroll" });
	return () => {
		for (const type of types) target.removeEventListener(type, handle, { capture: type !== "scroll" });
	};
}

export type LessonDeps = {
	ready: () => boolean;
	/** Plays the cue; resolves when it ends on its own. */
	play: () => Promise<void>;
	/** Stops the hand. */
	cancel: () => void;
	target?: EventTarget;
	store?: StorageLike | null;
	day?: () => string;
};

/**
 * Arms the cue on a page: plays once per page load after STILL_MS without a
 * decision, when the budget and the page allow. The budget is the cue's;
 * the sticker's lesson never touches it.
 */
export function armLesson(name: LessonName, deps: LessonDeps): () => void {
	const target = deps.target ?? window;
	const store = deps.store === undefined ? storage() : deps.store;
	const hook = devHook(store);
	if (hook === "never") return () => {};

	let timer: ReturnType<typeof setTimeout> | undefined;
	let playing = false;
	let done = false;

	const tick = () => {
		timer = undefined;
		if (done || playing) return;
		const day = (deps.day ?? today)();
		const budget = readBudget(name, store);
		if (hook !== "always" && !budgetAllows(budget, day)) {
			done = true;
			return;
		}
		if (!deps.ready()) {
			timer = setTimeout(tick, RECHECK_MS);
			return;
		}
		done = true;
		playing = true;
		// Spent before the play, so a cancelled lesson still uses the day: the reader has seen the hand.
		writeBudget(name, spend(budget, day), store);
		void deps.play().then(
			() => {
				playing = false;
			},
			(e: unknown) => {
				playing = false;
				console.error("lesson:", e);
			},
		);
	};
	const restart = () => {
		clearTimeout(timer);
		timer = undefined;
		if (!done) timer = setTimeout(tick, STILL_MS);
	};
	const stop = () => {
		if (!playing) return;
		playing = false;
		deps.cancel();
	};
	const unwatch = watchInput(target, DECISIONS, (e) => {
		if (playing) {
			if ((CANCELS as readonly string[]).includes(e.type)) stop();
			return;
		}
		restart();
	});
	restart();
	return () => {
		clearTimeout(timer);
		unwatch();
		stop();
	};
}

/** The search page's doors: elements by getter, read at each step, never cached. */
export type SearchDoors = {
	tabs: () => HTMLElement[];
	litTab: () => number;
	/** Lights a tab without navigating; null hands the page its own back. */
	setLitTab: (index: number | null) => void;
	input: () => HTMLElement | null;
	row: (index: number) => HTMLElement | null;
	globe: () => HTMLElement | null;
	typeIn: (text: string, msPerChar: number) => Promise<void>;
	clear: () => void;
	highlight: (index: number) => void;
};

/** The rating page's doors. */
export type RatingDoors = {
	scored: () => boolean;
	number: () => HTMLElement | null;
	dog: () => HTMLElement | null;
	nudge: () => void;
	/** The page y where the weeds stage pins; null without weeds. */
	weedsPin: () => number | null;
	litTable: () => WeedsTable;
	tab: (table: WeedsTable) => HTMLElement | null;
	lessonPick: (table: WeedsTable) => Promise<void>;
	/** The corner tally's big figure, or the phone strip's percentage. */
	tally: () => HTMLElement | null;
};
