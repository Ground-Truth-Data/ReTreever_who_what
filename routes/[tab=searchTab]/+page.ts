// keep as +page.ts, not +page.server.ts — this child must run with no server behind it
// Typed by hand: a child's route is mounted by a parent, so no `./$types` is ever generated beside it.
export const load = ({ params }: { params: { tab: string } }) => {
	return params.tab === "who"
		? { tab: "orgs" as const }
		: { tab: "projects" as const };
};
