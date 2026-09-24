/** Raw 0–1 score (a Prisma Decimal string) → 0–100 to one decimal; null, not 0, when unscored. */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.round(n * 1000) / 10 : null;
}

/** "73.3%" or "—"; coerces because Mapbox hands properties back as strings. */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

/** The host's API surface; an absent endpoint skips the fetch. */
export type WhoWhatEndpoints = {
	organizations?: string;
	projects?: string;
	organization?: (key: string) => string;
	project?: (key: string) => string;
	/** Search-hit analytics: GET top keys per tab, POST a landing. Absent → alphabetical, nothing logged. */
	searchHits?: string;
};

// The host's `error`: a standalone child has no @sveltejs/kit to import it from.
// Required, so a host that forgets it fails to compile.
export type WhoWhatFail = (status: number, message: string) => never;

/** The host's URL map. Absent → the page renders without those links. */
export type WhoWhatRoutes = {
	who?: string;
	what?: string;
	whoMap?: string;
	whoOrg?: (key: string) => string;
	whatProject?: (key: string) => string;
};
