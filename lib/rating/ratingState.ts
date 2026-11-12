// The one place the rating's four states are drawn. The hero's state line, the
// dog's clip, the share title and docs/theScore.md all follow this file.
export type RatingState = "opaque" | "partial" | "open" | "transparent";

export const RATING_STATES: readonly RatingState[] = ["opaque", "partial", "open", "transparent"];

// The rating is a percentile, so the published records spread evenly over 0–100 and equal-width
// bands hold about equal shares of them: each word names a quarter of the field. The cuts follow
// from the number of words alone, with no hand-set threshold to defend.
const WIDTH = 100 / RATING_STATES.length;

/** The lowest rating each state starts at, inclusive: 0, 25, 50, 75. */
export const RATING_STATE_FLOORS: Readonly<Record<RatingState, number>> = Object.fromEntries(
	RATING_STATES.map((state, i) => [state, i * WIDTH]),
) as Record<RatingState, number>;

/** The state word of a 0–100 rating; null when unscored. */
export function ratingState(rating: number | null): RatingState | null {
	if (rating === null || !Number.isFinite(rating)) return null;
	for (let i = RATING_STATES.length - 1; i > 0; i--) {
		if (rating >= RATING_STATE_FLOORS[RATING_STATES[i]]) return RATING_STATES[i];
	}
	return RATING_STATES[0];
}
