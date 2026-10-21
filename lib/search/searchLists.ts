import { toTransparencyScore, type WhoWhatEndpoints } from "../whoWhatTypes";
import type { SearchListItem } from "./searchTypes";

// Streamed, never awaited: these must never reject, an unhandled rejection crashes the page.

interface OrgListRow {
	organizationKey: string;
	organizationName: string;
	primaryStakeholderCategoryName: string | null;
	scoreOrgFinal: string | number | null;
}

interface ProjectListRow {
	projectKey: string;
	projectName: string;
	scoreProject: string | number | null;
}

/** Best rating first, unscored last, ties by name; the API orders by name only. */
function byRating(a: SearchListItem, b: SearchListItem): number {
	if (a.rating !== b.rating) {
		if (a.rating === null) return 1;
		if (b.rating === null) return -1;
		return b.rating - a.rating;
	}
	return a.name.localeCompare(b.name);
}

export async function loadOrgList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
): Promise<SearchListItem[]> {
	// Empty, not a fetch at "/undefined".
	if (!endpoints.organizations) return [];
	const endpoint = `${endpoints.organizations}?fields=organizationKey,organizationName,primaryStakeholderCategory,scoreOrgFinal`;

	try {
		const res = await fetch(endpoint);
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
				rating: toTransparencyScore(org.scoreOrgFinal),
			}))
			.sort(byRating);
	} catch (error) {
		console.error("who: failed to load organizations list", error);
		return [];
	}
}

export async function loadProjectList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
): Promise<SearchListItem[]> {
	if (!endpoints.projects) return [];
	// scored: only projects whose detail views have a score.
	const endpoint = `${endpoints.projects}?scored=true&fields=projectKey,projectName,scoreProject`;

	try {
		const res = await fetch(endpoint);
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
				rating: toTransparencyScore(project.scoreProject),
			}))
			.sort(byRating);
	} catch (error) {
		console.error("what: failed to load projects list", error);
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
