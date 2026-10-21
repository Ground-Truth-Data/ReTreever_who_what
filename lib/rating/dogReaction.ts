// Which dog clips play for a rating state. The state itself comes from
// ratingState.ts; nothing here draws a boundary.

import type { RatingState } from "./ratingState";

export type DogState = RatingState;

export type DogStep = { clip: string; loop: boolean };

/**
 * Entrance, then the state's turn, then whatever idle that state has drawn.
 * Only clips the manifest holds are returned, so a state with no settle or
 * pant simply holds its turn's last frame.
 */
export function sequenceFor(state: DogState | null, clips: Record<string, unknown>): DogStep[] {
	const has = (c: string) => c in clips;
	if (state === null) return has("dog-still-blink") ? [{ clip: "dog-still-blink", loop: true }] : [];
	const steps: DogStep[] = [];
	if (has("dog-entrance")) steps.push({ clip: "dog-entrance", loop: false });
	if (has(`dog-turn-${state}`)) steps.push({ clip: `dog-turn-${state}`, loop: false });
	if (has(`dog-to-neutral-${state}`)) steps.push({ clip: `dog-to-neutral-${state}`, loop: false });
	if (has(`dog-pant-${state}`)) steps.push({ clip: `dog-pant-${state}`, loop: true });
	return steps;
}

/** The blink to play on an idle tick once the sequence has settled, if the state has one. */
export function idleBlinkFor(state: DogState | null, clips: Record<string, unknown>): string | null {
	if (state !== null && `dog-blink-${state}` in clips) return `dog-blink-${state}`;
	return "dog-still-blink" in clips ? "dog-still-blink" : null;
}
