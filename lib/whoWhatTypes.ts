/**
 * The child's own vocabulary and the host contract — no ReTreever imports.
 *
 * WHAT MOVED, AND WHY. `toTransparencyScore` / `formatTransparencyScore` came
 * from ReTreever's lib utils, which a child may never touch. They MOVED rather
 * than becoming props because neither is proprietary and neither has a
 * dependency: one divides by 100, the other formats a percentage. A prop would
 * have made the host supply arithmetic it has no special knowledge of.
 *
 * WHAT DID NOT MOVE. `endpoints` and `AppRoutes` are genuinely the host's — its
 * API surface and its URL map. A child running on the harness has no /api/who
 * to fetch and no /who page to link to, so both arrive as props and both are
 * optional. Given nothing, the search lists come back empty and the links do
 * not render. That is the honest unhitched state, not a bug.
 */

/**
 * Coerce a raw 0–1 score (Prisma Decimal — json() serializes it as a string) to
 * a 0–100 percentage rounded to one decimal (73.3). NULL when unscored or
 * malformed — not 0, which would read as "scored zero" rather than "no score".
 */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.round(n * 1000) / 10 : null;
}

/**
 * Render a 0–100 score as "73.3%", or "—" when absent. Coerces first — Mapbox
 * hands feature properties back as strings.
 */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

/**
 * The host's API surface. ReTreever passes its `endpoints`; the harness passes
 * nothing and every fetch is skipped rather than aimed at a 404.
 */
export type WhoWhatEndpoints = {
	organizations?: string;
	projects?: string;
	organization?: (key: string) => string;
	project?: (key: string) => string;
};

/**
 * How this child fails a page — supplied by the host, like the endpoints above.
 *
 * WHY THIS IS A PORT AND NOT AN IMPORT.
 * resultLoad used `import { error } from "@sveltejs/kit"` and it was the only
 * thing in this child that reached a real package for behaviour rather than
 * types. That single line broke both results pages the moment the child moved
 * out to its own repo on 26 Aug 2026: Node resolves a bare import by walking UP
 * from the importing file, so from fetch/ReTreever_who_what/ it never reaches
 * the host's node_modules. /who/[key] and /what/[key] returned 500 before they
 * ran a line of their own code.
 *
 * `@sveltejs/kit` was a peerDependency — "the host provides this" — so making
 * it an actual prop states out loud what was already true, and no Vite setting
 * can fix it: SvelteKit forces its own package external whatever `noExternal`
 * says. The host passes SvelteKit's real `error`, so the thrown value is still
 * the HttpError SvelteKit recognises and the status page renders as before.
 *
 * NOT OPTIONAL, unlike the two above. Absent endpoints mean "render without
 * them"; absent failure handling has no such reading — a loader with no way to
 * say 404 cannot do its job. Required means a host that forgets it fails to
 * COMPILE, which is exactly what did not happen when /what forgot to pass its
 * endpoints and shipped a runtime crash instead.
 */
export type WhoWhatFail = (status: number, message: string) => never;

/** The host's URL map. Absent → the page renders without those links. */
export type WhoWhatRoutes = {
	who?: string;
	what?: string;
	whoMap?: string;
	whoOrg?: (key: string) => string;
	whatProject?: (key: string) => string;
};
