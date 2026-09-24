import type { WhoWhatEndpoints, WhoWhatFail } from "./whoWhatTypes";
import { toTransparencyScore } from "./whoWhatTypes";

// Awaited, unlike the streamed dropdown lists: the name and rating ARE the page.

export interface SearchResult {
	key: string;
	name: string;
	/** Transparency rating as a 0–100 percentage; null when unscored. */
	rating: number | null;
	/** Percentile rank, raw from the API; null when unranked. */
	rank: number | null;
	/** Secondary line — an org's stakeholder category. Projects have none. */
	hint?: string | null;
}

// Follows exactly one redirect: SvelteKit's server-side fetch of an internal
// route returns the 3xx instead of following it.
async function fetchItem<T>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	envelopeKey: string,
	notFoundMessage: string,
	fail: WhoWhatFail,
): Promise<T> {
	let res: Response;
	try {
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
	// A 200 with an empty envelope is the missing record it is.
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

/** The org's rating is `scoreOrgFinal`, the final blended org score. */
export async function loadOrganization(
	fetch: typeof globalThis.fetch,
	organizationKey: string,
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
		// scoreOrgFinal is a Prisma Decimal, a string over json().
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
