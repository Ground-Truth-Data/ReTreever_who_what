import type { PageLoad } from "./$types";

// keep as +page.ts, not +page.server.ts — this child must run with no server behind it
export const load: PageLoad = ({ params }) => {
	return params.tab === "who"
		? { tab: "orgs" as const }
		: { tab: "projects" as const };
};
