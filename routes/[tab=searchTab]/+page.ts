import type { PageLoad } from "./$types";

/**
 * One load for both tabs — /who and /what are the same route, so a tab switch
 * re-runs this with the other param rather than mounting a different page.
 *
 * A universal load (`+page.ts`, not `+page.server.ts`): this child must be
 * able to run with no server behind it, and resolving which tab is active is
 * pure string work that needs none.
 */
export const load: PageLoad = ({ params }) => {
	return params.tab === "who"
		? { tab: "orgs" as const }
		: { tab: "projects" as const };
};
