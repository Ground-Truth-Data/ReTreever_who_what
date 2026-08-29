// This child's own vocabulary and host contract — never import from ReTreever here

/** Coerces a raw 0–1 score (Prisma Decimal, serialized as string) to 0–100 rounded to one decimal; null (not 0) when unscored/malformed */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.round(n * 1000) / 10 : null;
}

/** Renders a 0–100 score as "73.3%" or "—" when absent; coerces first since Mapbox hands properties back as strings */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

/** Host's API surface; rapper passes nothing and fetches are skipped rather than aimed at a 404 */
export type WhoWhatEndpoints = {
	organizations?: string;
	projects?: string;
	organization?: (key: string) => string;
	project?: (key: string) => string;
};

// ⚠️ Never `import { error } from "@sveltejs/kit"` directly here — bare imports break once this child ships standalone (walks up, misses node_modules, /who and /what 500 instead)
// Required, not optional — a host that forgets to pass this fails to compile rather than crashing at runtime
export type WhoWhatFail = (status: number, message: string) => never;

/** The host's URL map. Absent → the page renders without those links. */
export type WhoWhatRoutes = {
	who?: string;
	what?: string;
	whoMap?: string;
	whoOrg?: (key: string) => string;
	whatProject?: (key: string) => string;
};
