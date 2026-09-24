import type { WhoWhatEndpoints } from "./whoWhatTypes";
import type { SearchListItem } from "./searchTypes";

// Streamed, never awaited: these must never reject, an unhandled rejection crashes the page.

interface OrgListRow {
	organizationKey: string;
	organizationName: string;
	primaryStakeholderCategory: string | null;
}

interface ProjectListRow {
	projectKey: string;
	projectName: string;
}

export async function loadOrgList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
): Promise<SearchListItem[]> {
	// Empty, not a fetch at "/undefined".
	if (!endpoints.organizations) return [];
	const endpoint = `${endpoints.organizations}?fields=organizationKey,organizationName,primaryStakeholderCategory`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { organizations } = (await res.json()) as {
			organizations: OrgListRow[];
		};

		return organizations.map((org) => ({
			key: org.organizationKey,
			name: org.organizationName,
			hint: org.primaryStakeholderCategory,
		}));
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
	const endpoint = `${endpoints.projects}?scored=true&fields=projectKey,projectName`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { projects } = (await res.json()) as {
			projects: ProjectListRow[];
		};

		return projects.map((project) => ({
			key: project.projectKey,
			name: project.projectName,
		}));
	} catch (error) {
		console.error("what: failed to load projects list", error);
		return [];
	}
}

/** Most-searched keys for a tab, best first. Empty when the host has no analytics endpoint. */
export async function loadTopKeys(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
	tab: "orgs" | "projects",
	limit = 5,
): Promise<string[]> {
	if (!endpoints.searchHits) return [];
	try {
		const res = await fetch(`${endpoints.searchHits}?tab=${tab}&limit=${limit}`);
		if (!res.ok) throw new Error(`searchHits responded ${res.status}`);
		const { keys } = (await res.json()) as { keys: string[] };
		return Array.isArray(keys) ? keys : [];
	} catch (error) {
		console.error("search: failed to load top keys", error);
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
