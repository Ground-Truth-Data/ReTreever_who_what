import type { WhoWhatEndpoints } from "./whoWhatTypes";
import type { SearchListItem } from "./searchTypes";

// ⚠️ Streamed dropdown lists (never awaited, shared by the search page and results pages) — must never reject: an unhandled rejection in a streamed promise crashes the page, so failures return [] instead.

/** The columns the who tab asks the collection endpoint for. */
interface OrgListRow {
	organizationKey: string;
	organizationName: string;
	primaryStakeholderCategory: string | null;
}

/** The columns the what tab asks the collection endpoint for. */
interface ProjectListRow {
	projectKey: string;
	projectName: string;
}

export async function loadOrgList(
	fetch: typeof globalThis.fetch,
	endpoints: WhoWhatEndpoints,
): Promise<SearchListItem[]> {
	// No host endpoint → an empty list, not a fetch at "/undefined".
	if (!endpoints.organizations) return [];
	// Server-side fetch of an internal route calls the handler directly, no HTTP round trip, keeping the org query in one place (the API).
	const endpoint = `${endpoints.organizations}?fields=organizationKey,organizationName,primaryStakeholderCategory`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { organizations } = (await res.json()) as {
			organizations: OrgListRow[];
		};

		// Rename into the dropdown's vocabulary; the endpoint already sorts.
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
	// `scored` matches whatV1: only projects whose detail views have a score.
	const endpoint = `${endpoints.projects}?scored=true&fields=projectKey,projectName`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new Error(`${endpoint} responded ${res.status}`);
		}
		const { projects } = (await res.json()) as {
			projects: ProjectListRow[];
		};

		// Rename into the dropdown's vocabulary; the endpoint already sorts.
		return projects.map((project) => ({
			key: project.projectKey,
			name: project.projectName,
		}));
	} catch (error) {
		console.error("what: failed to load projects list", error);
		return [];
	}
}
