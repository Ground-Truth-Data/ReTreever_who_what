// Which dog clips play for a rating state. The state itself comes from
// ratingState.ts; nothing here draws a boundary. Only clips the manifest holds
// are returned, so a missing clip is a skipped beat, never a broken <img>.

import type { RatingState } from "./ratingState";

export type DogState = RatingState;

/**
 * `loop`: forever, or a number of plays before the next step. `hold`: show the
 * clip's last frame and stay there until something replaces the step.
 * `frames`: the exposure sheet, one 1-based frame per tick, in place of the
 * clip played straight through.
 */
export type DogStep = { clip: string; loop: boolean | number; hold?: boolean; frames?: number[] };

const run = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const twos = (a: number, b: number) => run(a, b).flatMap((f) => [f, f]);

/**
 * Drawn frames spread over ticks at `pace` ticks per two frames: 4 is on twos,
 * 3 alternates two ticks and one.
 */
export function onPace(frameCount: number, pace: number): number[] {
	return run(1, frameCount).flatMap((f) => Array(f % 2 ? Math.ceil(pace / 2) : Math.floor(pace / 2)).fill(f));
}

/** `of` is the export's frame count the sheet is timed against. */
export type DogSheet = { of: number; ticks: number[] };

/**
 * Retimed clips. The art is drawn on twos with a few poses on ones, and those
 * single ticks read as snaps; a sheet puts them back on twos and caps the
 * byte-identical holds at 7 ticks. A clip re-exported with another frame
 * count plays as drawn.
 */
export const DOG_SHEETS: Record<string, DogSheet> = {
	"dog-entrance": { of: 49, ticks: [...run(1, 13), ...run(15, 28), ...twos(29, 33), ...run(34, 49)] },
	// Ends on 69, which joins the pant's 3 closer than its own 71 joins the pant's 1.
	"dog-turn-transparent": { of: 71, ticks: [...run(1, 47), ...twos(48, 49), ...run(50, 69)] },
	"dog-to-neutral-transparent": { of: 23, ticks: [1, 2, 3, 3, 4, 5, 5, 6, ...run(7, 23)] },
	"dog-turn-partial": { of: 163, ticks: [...run(1, 68), ...run(76, 122), ...run(142, 163)] },
	"dog-turn-opaque": { of: 60, ticks: [...run(1, 13), ...twos(14, 15), ...run(16, 60)] },
	// The pant slows as the dog calms: twice on ones (the first from the pose
	// the turn ends beside), once on threes, once on twos.
	"dog-pant-transparent": { of: 8, ticks: [...run(3, 8), ...run(1, 8), ...onPace(8, 3), ...twos(1, 8)] },
};

function step(clip: string, clips: Record<string, unknown>, loop: boolean | number = false): DogStep {
	const sheet = DOG_SHEETS[clip];
	const drawn = (clips[clip] as { frameCount?: number } | undefined)?.frameCount;
	return sheet && drawn === sheet.of ? { clip, loop, frames: sheet.ticks } : { clip, loop };
}

/** The walk on, played once before the dog stands. */
export function entranceFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-entrance" in clips ? [step("dog-entrance", clips)] : [];
}

/**
 * Watching the number after the walk on: the entrance's last frame, held. It is
 * the profile every turn starts from; the front-facing standing loop between
 * them made the dog look away and back just before it reacted.
 */
export function watchingFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-entrance" in clips ? [{ clip: "dog-entrance", loop: false, hold: true }] : standingFor(clips);
}

/** Standing and watching, looped for as long as the number is not up. */
export function standingFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-still-blink" in clips ? [{ clip: "dog-still-blink", loop: true }] : [];
}

/**
 * The turn in the state's colour, then the pant and the settle that state has
 * drawn, in the order the art joins: a turn ends where its pant starts, and a
 * to-neutral starts from the pant's last frame (or the turn's, with no pant).
 * An unscored dog takes the open state's turn, the plain one, so it never cuts
 * from profile to facing front.
 */
export function reactionFor(state: DogState | null, clips: Record<string, unknown>): DogStep[] {
	const turn = `dog-turn-${state ?? "open"}`;
	const steps: DogStep[] = [];
	if (turn in clips) steps.push(step(turn, clips));
	if (state === null) return steps;
	if (`dog-pant-${state}` in clips) steps.push(step(`dog-pant-${state}`, clips));
	if (`dog-to-neutral-${state}` in clips) steps.push(step(`dog-to-neutral-${state}`, clips));
	return steps;
}

export const BREATH = "dog-pant-neutral";
export const BREATH_BLINK = "dog-pant-blink";
/** Ticks per two drawn frames of the idle breath: 3 is 0.625 s a breath, 4 would be its drawn twos. */
export const BREATH_PACE = 3;
const BREATH_FRAMES = 10;
export const BREATH_SHEET = onPace(BREATH_FRAMES, BREATH_PACE);
/** The blink inside the breath, at the breath's pace so the mouth keeps its rhythm through it: 0.75 s. */
export const BREATH_BLINK_SHEET = onPace(12, BREATH_PACE);
/** Breaths between two blinks; with the blink, 3.25-5.75 s from one blink to the next. */
export const BREATH_PLAYS: readonly [number, number] = [4, 8];
/** Breath frames the blink joins cleanly from; any other pops the head. */
export const BLINK_FROM: readonly number[] = [9, 10, 1, 2];

/**
 * The settled dog's breath, when the reaction ends on the neutral face the
 * breath is drawn from; null for a face it would pop out of (the sad turn).
 * Its counted loop ends in a BREATH_BLINK.
 */
export function idleFor(reaction: DogStep[], clips: Record<string, unknown>, plays: number): DogStep | null {
	const last = reaction.at(-1)?.clip;
	const neutral = !!last && (last.startsWith("dog-to-neutral-") || last === "dog-turn-open");
	if (!neutral || !(BREATH in clips) || !(BREATH_BLINK in clips)) return null;
	return { clip: BREATH, loop: plays, frames: BREATH_SHEET };
}

/** How many breaths before the next blink, random within BREATH_PLAYS. */
export function breathPlays(random: () => number = Math.random): number {
	const [lo, hi] = BREATH_PLAYS;
	return lo + Math.floor(random() * (hi - lo + 1));
}

/**
 * The blink for a settled dog held on its last frame (reduced motion, or a face
 * with no breath drawn). A state that settles to neutral blinks the neutral
 * blink: its own is drawn from the face it had before the settle.
 */
export function idleBlinkFor(state: DogState | null, clips: Record<string, unknown>): string | null {
	if (state !== null && !(`dog-to-neutral-${state}` in clips) && `dog-blink-${state}` in clips) return `dog-blink-${state}`;
	return "dog-still-blink" in clips ? "dog-still-blink" : null;
}
