// The one place the rating's four states are drawn. The hero's state line, the
// dog's clip, the share title and docs/theScore.md all follow this file; the
// cuts are the designer's, from the clip folders the dog was drawn in.
export type RatingState = "opaque" | "partial" | "open" | "transparent";

export const RATING_STATES: readonly RatingState[] = ["opaque", "partial", "open", "transparent"];

/** Inclusive upper bound of each state; the last runs to 100. */
export const RATING_STATE_CEILINGS: Readonly<Record<RatingState, number>> = {
	opaque: 29,
	partial: 59,
	open: 85,
	transparent: 100,
};

/** The state word of a 0–100 rating; null when unscored. */
export function ratingState(rating: number | null): RatingState | null {
	if (rating === null || !Number.isFinite(rating)) return null;
	const r = Math.round(rating);
	for (const state of RATING_STATES) {
		if (r <= RATING_STATE_CEILINGS[state]) return state;
	}
	return "transparent";
}
