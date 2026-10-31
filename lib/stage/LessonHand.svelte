<script lang="ts">
// The teaching hand on a who/what page: mounted on <body>, playing one of two
// wordless lessons when the help sticker is pressed, and the two-second cue
// that taps the sticker when a stranger sits still. The hand is never a
// control and draws nothing but itself; every target is measured at the step
// it is reached, so a shift mid-lesson lands the fingertip where the element is now.
import TeachingHand from "$gc/TeachingHand.svelte";
import { handPortal } from "$gc/handPortal";
import { WEEDS_TABLES } from "../whoWhatTypes";
import { curtain } from "./curtain.svelte";
import { armLesson, CANCELS, isReady, watchInput, type LessonName, type RatingDoors, type ReadyFacts, type SearchDoors } from "./lessons.svelte";

let {
	name,
	facts,
	search = undefined,
	rating = undefined,
}: {
	name: LessonName;
	/** What only the page knows: focus in its bar or filter, its list open, its own readiness. */
	facts: () => Pick<ReadyFacts, "focusWithin" | "dropdownOpen" | "pageReady">;
	search?: SearchDoors;
	rating?: RatingDoors;
} = $props();

let hand = $state<TeachingHand | null>(null);
let run = 0;
// The hand is mid-cue or mid-lesson; `running` is the lesson alone, the sticker's pressed state.
let active = false;
let running = $state(false);
let unwatch: (() => void) | null = null;
let restore: (() => void) | null = null;

const STOP = Symbol("lesson cancelled");
type Point = [number, number];
type Step = <T>(p: Promise<T> | T) => Promise<T>;
type Wait = (ms: number) => Promise<void>;

export function playing(): boolean {
	return running;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// A target's fingertip point, or null when it is not on screen: such a step is skipped, never scrolled to.
function at(el: HTMLElement | null | undefined, fx: number, fy: number): Point | null {
	if (!el) return null;
	const r = el.getBoundingClientRect();
	if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return null;
	return [r.left + r.width * fx, r.top + r.height * fy];
}

function ready(): boolean {
	return isReady({
		reducedMotion: reduced(),
		curtainHref: curtain.href,
		visibility: document.visibilityState,
		...facts(),
	});
}

// Every await checks the run is still this one; a cancel in between throws STOP out of the script.
function begin(): { mine: number; step: Step; wait: Wait } {
	cancel();
	const mine = ++run;
	active = true;
	async function step<T>(p: Promise<T> | T): Promise<T> {
		const v = await p;
		if (run !== mine) throw STOP;
		return v;
	}
	const wait = (ms: number) => step(new Promise<void>((r) => setTimeout(r, ms)));
	return { mine, step, wait };
}

function end(h: TeachingHand, mine: number): void {
	if (run !== mine) return;
	h.cancel();
	active = false;
	running = false;
	unwatch?.();
	unwatch = null;
	restore?.();
	restore = null;
}

export function cancel(): void {
	if (!active) return;
	active = false;
	running = false;
	const mine = ++run;
	unwatch?.();
	unwatch = null;
	const back = restore;
	restore = null;
	back?.();
	const h = hand;
	if (!h) return;
	void h.fadeOut(0.15).then(() => {
		if (run === mine) h.cancel();
	});
}

/** The page's full lesson, as often as the sticker is pressed; no budget. */
export async function play(): Promise<void> {
	const h = hand;
	if (!h || curtain.href !== null || reduced()) return;
	const { mine, step, wait } = begin();
	running = true;
	unwatch = watchInput(window, CANCELS, cancel);
	try {
		if (name === "search" && search) await searchLesson(h, search, step, wait);
		else if (name === "rating" && rating) await ratingLesson(h, rating, step, wait);
		end(h, mine);
	} catch (e) {
		if (e !== STOP) throw e;
	}
}

// The hand rises from below the sticker, taps it once and goes: "help lives here".
async function cue(): Promise<void> {
	const h = hand;
	const sticker = at(document.querySelector<HTMLElement>(".help-sticker"), 0.5, 0.5);
	if (!h || !sticker) return;
	const { mine, step, wait } = begin();
	try {
		h.place(sticker[0], innerHeight + 60);
		await step(h.fadeIn());
		await step(h.moveTo(sticker[0], sticker[1], { curve: 24, duration: 0.9 }));
		await step(h.tap());
		await wait(400);
		await step(h.fadeOut());
		end(h, mine);
	} catch (e) {
		if (e !== STOP) throw e;
	}
}

async function searchLesson(h: TeachingHand, d: SearchDoors, step: Step, wait: Wait) {
	restore = () => {
		d.clear();
		d.highlight(-1);
		d.setLitTab(null);
	};
	const lit = d.litTab();
	const tabs = d.tabs();
	const first = at(tabs[lit], 0.5, 0.5);
	if (!first) return;
	h.place(first[0], innerHeight + 60);
	await step(h.fadeIn());
	await step(h.moveTo(first[0], first[1], { duration: 1 }));
	await step(h.tap());
	const other = lit === 0 ? 1 : 0;
	const second = at(tabs[other], 0.5, 0.5);
	if (second) {
		await step(h.moveTo(second[0], second[1], { curve: -24, duration: 0.6 }));
		await step(h.tap());
		d.setLitTab(other);
		await wait(400);
	}
	const input = at(d.input(), 0, 0.5);
	if (input) {
		const x = input[0] + 10;
		await step(h.moveTo(x, input[1], { curve: 30, duration: 0.8 }));
		h.setGrip("point");
		await step(Promise.all([d.typeIn("for", 120), h.moveTo(x + 18, input[1], { duration: 0.36, ease: "none" })]));
		await wait(600);
		d.highlight(0);
		await wait(80);
		const row = at(d.row(0), 0, 0.5);
		if (row) {
			await step(h.moveTo(row[0] + 24, row[1], { duration: 0.6 }));
			await step(h.press(0.4));
		}
		await step(h.lift());
	}
	const globe = at(d.globe(), 0.5, 0.5);
	if (globe) {
		await step(h.moveTo(globe[0], globe[1], { curve: 40, duration: 0.8 }));
		await step(h.tap());
	}
	await step(h.fadeOut());
}

// Resolves when the page has reached `top` within 2 px, or 1.5 s have passed.
function settled(top: number): Promise<void> {
	const until = performance.now() + 1500;
	return new Promise((resolve) => {
		const poll = () => (Math.abs(scrollY - top) <= 2 || performance.now() >= until ? resolve() : requestAnimationFrame(poll));
		poll();
	});
}

async function ratingLesson(h: TeachingHand, d: RatingDoors, step: Step, wait: Wait) {
	restore = null;
	let placed = false;
	const enter = async (x: number, y: number) => {
		if (placed) return;
		placed = true;
		h.place(x, y);
		await step(h.fadeIn());
	};
	if (d.scored()) {
		const edge = at(d.number(), 1, 0.5);
		const centre = at(d.number(), 0.5, 0.5);
		if (edge && centre) {
			await enter(edge[0] + 48, edge[1]);
			await step(h.moveTo(centre[0], centre[1], { duration: 0.7 }));
			await step(h.tap());
		}
		const nose = at(d.dog(), 0.42, 0.5);
		if (nose) {
			await enter(nose[0] - 80, nose[1] + 60);
			await step(h.moveTo(nose[0], nose[1], { curve: -60, duration: 0.9 }));
			await step(h.tap());
			d.nudge();
			await wait(500);
		}
	}
	const pin = d.weedsPin();
	if (pin === null) {
		if (placed) await step(h.fadeOut());
		return;
	}
	const mx = innerWidth / 2;
	const my = innerHeight * 0.6;
	await enter(mx, my + 40);
	await step(h.moveTo(mx, my, { duration: 0.6 }));
	h.setGrip("fist");
	await wait(120);
	scrollTo({ top: pin, behavior: "smooth" });
	await step(h.moveTo(mx, my - 180, { duration: 0.9 }));
	await step(settled(pin));
	h.setGrip("point");
	const lit = WEEDS_TABLES.indexOf(d.litTable());
	const next = WEEDS_TABLES[(lit + 1) % WEEDS_TABLES.length];
	const tab = at(d.tab(next), 0.5, 0.5);
	if (tab) {
		await step(h.moveTo(tab[0], tab[1], { duration: 0.7 }));
		await step(h.tap());
		await step(d.lessonPick(next));
		await wait(500);
	}
	const tally = at(d.tally(), 0.5, 0.5);
	if (tally) {
		await step(h.moveTo(tally[0], tally[1], { curve: 40, duration: 0.8 }));
		await step(h.press(0.4));
	}
	await step(h.lift());
	await step(h.fadeOut());
}

$effect(() => {
	if (!hand) return;
	return armLesson(name, { ready: () => !running && ready(), play: cue, cancel });
});

// A wipe or a route change ends the lesson at once; the page under the hand is leaving.
$effect(() => {
	if (curtain.href !== null) cancel();
});

$effect(() => {
	if (!import.meta.env.DEV) return;
	const w = window as Window & { rtvrLesson?: { play: (n: LessonName) => Promise<void> | undefined; cancel: () => void } };
	w.rtvrLesson = { play: (n) => (n === name ? play() : undefined), cancel };
	return () => {
		delete w.rtvrLesson;
	};
});
</script>

<div class="lesson-hand" use:handPortal aria-hidden="true">
	<TeachingHand bind:this={hand} />
</div>

<style>
	.lesson-hand {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}
</style>
