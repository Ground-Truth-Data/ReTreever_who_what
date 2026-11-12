/** The one converter from a stored 0–1 score to the 0–100 shown, to one decimal; null, not 0, when unscored. */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	// An org's stored score can pass 1 (an uncapped disclosure ratio); the shown number never leaves 0–100.
	return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 1000) / 10)) : null;
}
