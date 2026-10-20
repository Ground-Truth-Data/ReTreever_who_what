// The clips' thresholds; docs/theScore.md draws different ones and which is the source is still open.
export type RatingState = "opaque" | "partial" | "open" | "transparent";

/** The state word of a 0–100 rating; null when unscored. */
export function ratingState(rating: number | null): RatingState | null {
	if (rating === null || !Number.isFinite(rating)) return null;
	const r = Math.round(rating);
	if (r <= 29) return "opaque";
	if (r <= 59) return "partial";
	if (r <= 85) return "open";
	return "transparent";
}
