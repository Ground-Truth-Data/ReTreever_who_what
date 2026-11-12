import type { WhoWhatEndpoints } from "../whoWhatTypes";
import type { SearchListItem } from "./searchTypes";

// Every endpoint emits the 0–100 rating already; this only refuses what is not a number.
const shown = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);

// Streamed, never awaited: these must never reject, an unhandled rejection crashes the page.

/** One org as the list endpoint answers the fields the search bar asks for. */
export type OrgListRow = {
	organizationKey: string;
	organizationName: string;
	primaryStakeholderCategoryName: string | null;
	/** The published percentile, 0–100. */
	rating: number | null;
};

/** One project as the list endpoint answers the fields the search bar asks for. */
export type ProjectListRow = {
	projectKey: string;
	projectName: string;
	/** The published percentile, 0–100. */
	rating: number | null;
};

/** Best rating first, unscored last, ties by name: the API's order, kept by the client for a list it merges. */
function byRating(a: SearchListItem, b: SearchListItem): number {
	if (a.rating !== b.rating) {
		if (a.rating === null) return 1;
		if (b.rating === null) return -1;
		return b.rating - a.rating;
	}
	return a.name.localeCompare(b.name);
}

/** The API's ceiling for a key-less list; the bar narrows by asking again, never by paging. */
export const LIST_LIMIT = 50;

const listQuery = (fields: string, query: string, extra: Record<string, string> = {}) => {
	const params = new URLSearchParams({ ...extra, fields, sort: "rating", limit: String(LIST_LIMIT) });
	const q = query.trim();
	if (q) params.set("q", q);
	return params.toString();
};

/** The best-rated orgs whose name contains `query`, or the best-rated of all when it is empty. */
export async function loadOrgList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
	query = "",
	signal?: AbortSignal,
): Promise<SearchListItem[]> {
	// Empty, not a fetch at "/undefined".
	if (!endpoints.organizations) return [];
	const endpoint = `${endpoints.organizations}?${listQuery("organizationKey,organizationName,primaryStakeholderCategory,rating", query)}`;

	try {
		const res = await fetch(endpoint, { signal });
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { organizations } = (await res.json()) as {
			organizations: OrgListRow[];
		};

		return organizations
			.map((org) => ({
				key: org.organizationKey,
				name: org.organizationName,
				hint: org.primaryStakeholderCategoryName,
				rating: shown(org.rating),
			}))
			.sort(byRating);
	} catch (error) {
		if (signal?.aborted) return [];
		console.error("who: failed to load organizations list", error);
		return [];
	}
}

export async function loadProjectList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
	query = "",
	signal?: AbortSignal,
): Promise<SearchListItem[]> {
	if (!endpoints.projects) return [];
	// scored: only projects the published run scored.
	const endpoint = `${endpoints.projects}?${listQuery("projectKey,projectName,rating", query, { scored: "true" })}`;

	try {
		const res = await fetch(endpoint, { signal });
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { projects } = (await res.json()) as {
			projects: ProjectListRow[];
		};

		return projects
			.map((project) => ({
				key: project.projectKey,
				name: project.projectName,
				rating: shown(project.rating),
			}))
			.sort(byRating);
	} catch (error) {
		if (signal?.aborted) return [];
		console.error("what: failed to load projects list", error);
		return [];
	}
}

/** The tab's most-viewed rows, best first, from the search-hit counter; empty on any failure. */
export async function loadMostViewed(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
	tab: "orgs" | "projects",
	signal?: AbortSignal,
): Promise<SearchListItem[]> {
	if (!endpoints.searchHits) return [];
	const endpoint = `${endpoints.searchHits}?tab=${tab}`;
	try {
		const res = await fetch(endpoint, { signal });
		if (!res.ok) throw new Error(`${endpoint} responded ${res.status}`);
		const { hits } = (await res.json()) as { hits: { key: string; name: string }[] };
		return hits.map((hit) => ({ key: hit.key, name: hit.name, rating: null }));
	} catch (error) {
		if (signal?.aborted) return [];
		console.error("search: failed to load the most viewed", error);
		return [];
	}
}

/** Fire-and-forget: the page is about to navigate, so keepalive lets the request outlive it. */
export function recordSearchHit(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
	tab: "orgs" | "projects",
	key: string,
): void {
	if (!endpoints.searchHits) return;
	fetch(endpoints.searchHits, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ tab, key }),
		keepalive: true,
	}).catch(() => {});
}
