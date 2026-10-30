// Which dog clips play for a rating state. The state itself comes from
// ratingState.ts; nothing here draws a boundary. Only clips the manifest holds
// are returned, so a missing clip is a skipped beat, never a broken <img>.

import type { RatingState } from "./ratingState";

export type DogState = RatingState;

export type DogStep = { clip: string; loop: boolean };

/** The walk on, played once before the dog stands. */
export function entranceFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-entrance" in clips ? [{ clip: "dog-entrance", loop: false }] : [];
}

/** Standing and watching, looped for as long as the number is not up. */
export function standingFor(clips: Record<string, unknown>): DogStep[] {
	return "dog-still-blink" in clips ? [{ clip: "dog-still-blink", loop: true }] : [];
}

/** The turn in the state's colour, then whatever settle and pant that state has drawn. */
export function reactionFor(state: DogState, clips: Record<string, unknown>): DogStep[] {
	const steps: DogStep[] = [];
	if (`dog-turn-${state}` in clips) steps.push({ clip: `dog-turn-${state}`, loop: false });
	if (`dog-to-neutral-${state}` in clips) steps.push({ clip: `dog-to-neutral-${state}`, loop: false });
	if (`dog-pant-${state}` in clips) steps.push({ clip: `dog-pant-${state}`, loop: true });
	return steps;
}

/** The blink to play on an idle tick once the reaction has settled, if the state has one. */
export function idleBlinkFor(state: DogState | null, clips: Record<string, unknown>): string | null {
	if (state !== null && `dog-blink-${state}` in clips) return `dog-blink-${state}`;
	return "dog-still-blink" in clips ? "dog-still-blink" : null;
}
