// Which dog clips play for a rating state. The state itself comes from
// ratingState.ts; nothing here draws a boundary. Only clips the manifest holds
// are returned, so a missing clip is a skipped beat, never a broken <img>.

import type { RatingState } from "./ratingState";

export type DogState = RatingState;

/**
 * `loop`: forever, or a number of plays before the next step. `hold`: show the
 * clip's last frame and stay there until something replaces the step.
 */
export type DogStep = { clip: string; loop: boolean | number; hold?: boolean };

// About three seconds of the eight-frame pant at 24 fps before the dog calms.
const PANT_PLAYS = 9;

/** The walk on, played once before the dog stands. */
export function entranceFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-entrance" in clips ? [{ clip: "dog-entrance", loop: false }] : [];
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
	if (turn in clips) steps.push({ clip: turn, loop: false });
	if (state === null) return steps;
	if (`dog-pant-${state}` in clips) steps.push({ clip: `dog-pant-${state}`, loop: PANT_PLAYS });
	if (`dog-to-neutral-${state}` in clips) steps.push({ clip: `dog-to-neutral-${state}`, loop: false });
	return steps;
}

/** The blink to play on an idle tick once the reaction has settled, if the state has one. */
export function idleBlinkFor(state: DogState | null, clips: Record<string, unknown>): string | null {
	if (state !== null && `dog-blink-${state}` in clips) return `dog-blink-${state}`;
	return "dog-still-blink" in clips ? "dog-still-blink" : null;
}
