import type { WhoWhatEndpoints, WhoWhatFail } from "./whoWhatTypes";
import { toTransparencyScore } from "./whoWhatTypes";

// Shared org/project result loader, so the two results routes can't drift on scoring/missing-key behavior. Unlike the search page's streamed dropdowns, these loads are AWAITED — the name and rating ARE the page.

/** What a results page renders, whichever resource it came from. */
export interface SearchResult {
	/** organizationKey / projectKey. */
	key: string;
	name: string;
	/** Transparency rating as a 0–100 percentage; null when unscored. */
	rating: number | null;
	/** Percentile rank, raw from the API; null when unranked. */
	rank: number | null;
	/** Secondary line — an org's stakeholder category. Projects have none. */
	hint?: string | null;
}

// ⚠️ Follows exactly one redirect — SvelteKit's server-side fetch of an internal route returns a 3xx instead of following it itself; a second redirect would mean the data is malformed, so it is not looped.
async function fetchItem<T>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	envelopeKey: string,
	notFoundMessage: string,
	// The host's `error` function — see WhoWhatFail; passed in because a child can't import @sveltejs/kit itself.
	fail: WhoWhatFail,
): Promise<T> {
	let res: Response;
	try {
		// A server-side fetch of an internal route calls the handler directly, no HTTP round trip, so the query stays in one place (the API).
		res = await fetch(endpoint);

		const redirectedTo = res.status === 302 && res.headers.get("location");
		if (redirectedTo) {
			res = await fetch(redirectedTo);
		}
	} catch (cause) {
		console.error(`results: ${endpoint} failed`, cause);
		throw fail(500, "Could not reach the data service");
	}

	if (res.status === 404) {
		throw fail(404, notFoundMessage);
	}
	if (!res.ok) {
		console.error(`results: ${endpoint} responded ${res.status}`);
		throw fail(500, "Could not load this record");
	}

	const payload = (await res.json()) as Record<string, T>;
	const item = payload[envelopeKey];
	// A 200 with an empty envelope would otherwise reach the page as a card of undefineds; treat it as the missing record it is.
	if (!item) {
		throw fail(404, notFoundMessage);
	}
	return item;
}

interface OrgRow {
	organizationKey: string;
	organizationName: string;
	scoreOrgFinal: unknown;
	scoreRankOverall: number | null;
	primaryStakeholderCategory: string | null;
}

/** The org's rating is `scoreOrgFinal` — the final blended org score. */
export async function loadOrganization(
	fetch: typeof globalThis.fetch,
	organizationKey: string,
	// The host's API surface, passed in like `fetch` — a child owns no endpoints, so hardcoding a path here would bind it to whichever product mounts the page.
	endpoints: WhoWhatEndpoints,
	fail: WhoWhatFail,
): Promise<SearchResult> {
	const fields =
		"organizationKey,organizationName,scoreOrgFinal,scoreRankOverall,primaryStakeholderCategory";
	const org = await fetchItem<OrgRow>(
		fetch,
		`${endpoints.organization?.(organizationKey) ?? ""}?fields=${fields}`,
		"organization",
		`No organization with the key "${organizationKey}"`,
		fail,
	);

	return {
		key: org.organizationKey,
		name: org.organizationName,
		// Converted HERE, once — scoreOrgFinal is a Prisma Decimal and arrives over json() as a string, so the page only ever sees the 0–100 number.
		rating: toTransparencyScore(org.scoreOrgFinal),
		rank: org.scoreRankOverall,
		hint: org.primaryStakeholderCategory,
	};
}

interface ProjectRow {
	projectKey: string;
	projectName: string;
	scoreProject: unknown;
	scoreProjectRank: number | null;
}

/** The project's rating is `scoreProject` — same 0–1 scale as the org score. */
export async function loadProject(
	fetch: typeof globalThis.fetch,
	projectKey: string,
	endpoints: WhoWhatEndpoints,
	fail: WhoWhatFail,
): Promise<SearchResult> {
	const fields = "projectKey,projectName,scoreProject,scoreProjectRank";
	const project = await fetchItem<ProjectRow>(
		fetch,
		`${endpoints.project?.(projectKey) ?? ""}?fields=${fields}`,
		"project",
		`No project with the key "${projectKey}"`,
		fail,
	);

	return {
		key: project.projectKey,
		name: project.projectName,
		rating: toTransparencyScore(project.scoreProject),
		rank: project.scoreProjectRank,
	};
}
