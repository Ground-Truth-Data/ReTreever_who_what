import type { WhoWhatEndpoints, WhoWhatFail } from "../whoWhatTypes";

// Every endpoint emits 0–100 already; this only refuses what is not a number.
const shown = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);

// Awaited, unlike the streamed dropdown lists: the name and rating ARE the page.

export interface SearchResult {
	key: string;
	name: string;
	/** The published percentile, 0–100; null when unscored or before a first publish. */
	rating: number | null;
	/** "unreviewed": no reviewed claim, ranked among its own kind. Null for a project, or unscored. */
	cohort: Cohort | null;
	/** The published score run the rating was read from. */
	scoreRunId: string | null;
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
): Promise<{ item: T; scoreRunId: string | null }> {
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

	const payload = (await res.json()) as Record<string, unknown>;
	const item = payload[envelopeKey] as T | undefined;
	// A 200 with an empty envelope is the missing record it is.
	if (!item) {
		throw fail(404, notFoundMessage);
	}
	return { item, scoreRunId: typeof payload.scoreRunId === "string" ? payload.scoreRunId : null };
}

export type Cohort = "reviewed" | "unreviewed";

/** One org as the record endpoint answers the fields this page asks for. */
export type OrgRow = {
	organizationKey: string;
	organizationName: string;
	/** The published percentile, 0–100. */
	rating: number | null;
	cohort: Cohort | null;
	primaryStakeholderCategoryName: string | null;
};

/** One project as the record endpoint answers the fields this page asks for. */
export type ProjectRow = {
	projectKey: string;
	projectName: string;
	/** The published percentile, 0–100. */
	rating: number | null;
};

const cohortOf = (raw: unknown): Cohort | null => (raw === "reviewed" || raw === "unreviewed" ? raw : null);

/** The org's rating is its published percentile within its cohort. */
export async function loadOrganization(
	fetch: typeof globalThis.fetch,
	organizationKey: string,
	endpoints: WhoWhatEndpoints,
	fail: WhoWhatFail,
): Promise<SearchResult> {
	const fields = "organizationKey,organizationName,rating,cohort,primaryStakeholderCategory";
	const { item: org, scoreRunId } = await fetchItem<OrgRow>(
		fetch,
		`${endpoints.organization?.(organizationKey) ?? ""}?fields=${fields}`,
		"organization",
		`No organization with the key "${organizationKey}"`,
		fail,
	);

	return {
		key: org.organizationKey,
		name: org.organizationName,
		rating: shown(org.rating),
		cohort: cohortOf(org.cohort),
		scoreRunId,
		hint: org.primaryStakeholderCategoryName,
	};
}

/** The project's rating is its published percentile among scored projects. */
export async function loadProject(
	fetch: typeof globalThis.fetch,
	projectKey: string,
	endpoints: WhoWhatEndpoints,
	fail: WhoWhatFail,
): Promise<SearchResult> {
	const fields = "projectKey,projectName,rating";
	const { item: project, scoreRunId } = await fetchItem<ProjectRow>(
		fetch,
		`${endpoints.project?.(projectKey) ?? ""}?fields=${fields}`,
		"project",
		`No project with the key "${projectKey}"`,
		fail,
	);

	return {
		key: project.projectKey,
		name: project.projectName,
		rating: shown(project.rating),
		cohort: null,
		scoreRunId,
	};
}
