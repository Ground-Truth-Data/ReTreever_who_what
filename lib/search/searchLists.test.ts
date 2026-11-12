import { afterEach, describe, expect, it, vi } from "vitest";
import { LIST_LIMIT, loadMostViewed, loadOrgList, loadProjectList } from "./searchLists";

const ENDPOINTS = { organizations: "/api/who/organizations", projects: "/api/what/projects" };

function fetchReturning(body: unknown, ok = true) {
	const fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));
	return fetch as unknown as typeof globalThis.fetch & ReturnType<typeof vi.fn>;
}

afterEach(() => vi.restoreAllMocks());

describe("loadOrgList", () => {
	it("asks for one capped page of the best-rated, with the key, name, category and final score", async () => {
		const fetch = fetchReturning({ organizations: [] });
		await loadOrgList(fetch, ENDPOINTS);
		expect(fetch).toHaveBeenCalledTimes(1);
		const url = new URL(fetch.mock.calls[0][0] as string, "http://x");
		expect(url.pathname).toBe("/api/who/organizations");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			fields: "organizationKey,organizationName,primaryStakeholderCategory,rating",
			sort: "rating",
			limit: String(LIST_LIMIT),
		});
	});

	it("hands the bar's words to the server, and sends none for a blank bar", async () => {
		const fetch = fetchReturning({ organizations: [] });
		await loadOrgList(fetch, ENDPOINTS, "  eden & co ");
		await loadOrgList(fetch, ENDPOINTS, "   ");
		const q = (n: number) => new URL(fetch.mock.calls[n][0] as string, "http://x").searchParams.get("q");
		expect(q(0)).toBe("eden & co");
		expect(q(1)).toBeNull();
	});

	it("maps a row to key, name, hint and the 0–100 rating as sent, best first and unscored last", async () => {
		const fetch = fetchReturning({
			organizations: [
				{ organizationKey: "a", organizationName: "Aaranyak", primaryStakeholderCategoryName: "Developer", rating: 59.4 },
				{ organizationKey: "b", organizationName: "Bare", primaryStakeholderCategoryName: null, rating: null },
				{ organizationKey: "c", organizationName: "Canopy", primaryStakeholderCategoryName: "Funder", rating: 85.3 },
				{ organizationKey: "d", organizationName: "Dune", primaryStakeholderCategoryName: null, rating: 59.4 },
			],
		});
		const rows = await loadOrgList(fetch, ENDPOINTS);
		expect(rows).toEqual([
			{ key: "c", name: "Canopy", hint: "Funder", rating: 85.3 },
			{ key: "a", name: "Aaranyak", hint: "Developer", rating: 59.4 },
			{ key: "d", name: "Dune", hint: null, rating: 59.4 },
			{ key: "b", name: "Bare", hint: null, rating: null },
		]);
	});

	it("resolves to [] on a failed response and on a thrown fetch, never rejecting", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(loadOrgList(fetchReturning({}, false), ENDPOINTS)).resolves.toEqual([]);
		const throwing = vi.fn(async () => {
			throw new Error("offline");
		}) as unknown as typeof globalThis.fetch;
		await expect(loadOrgList(throwing, ENDPOINTS)).resolves.toEqual([]);
	});

	it("skips the fetch when the host has no organizations endpoint", async () => {
		const fetch = fetchReturning({ organizations: [] });
		await expect(loadOrgList(fetch, {})).resolves.toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("a request its page aborted", () => {
	it("answers empty without an error in the console", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const leaving = new AbortController();
		leaving.abort();
		const fetch = vi.fn(async () => {
			throw new TypeError("Failed to fetch");
		}) as unknown as typeof globalThis.fetch;

		await expect(loadOrgList(fetch, ENDPOINTS, "", leaving.signal)).resolves.toEqual([]);
		await expect(loadProjectList(fetch, ENDPOINTS, "", leaving.signal)).resolves.toEqual([]);
		expect(error).not.toHaveBeenCalled();
	});
});

describe("loadProjectList", () => {
	it("asks for one capped page of scored projects, best first, with key, name and score", async () => {
		const fetch = fetchReturning({ projects: [] });
		await loadProjectList(fetch, ENDPOINTS, "mangrove");
		expect(fetch).toHaveBeenCalledTimes(1);
		const url = new URL(fetch.mock.calls[0][0] as string, "http://x");
		expect(url.pathname).toBe("/api/what/projects");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			scored: "true",
			fields: "projectKey,projectName,rating",
			sort: "rating",
			limit: String(LIST_LIMIT),
			q: "mangrove",
		});
	});

	it("maps a row to key, name and rating, best first", async () => {
		const fetch = fetchReturning({
			projects: [
				{ projectKey: "p1", projectName: "Waterways", rating: 55.7 },
				{ projectKey: "p2", projectName: "Commons", rating: 58.3 },
				{ projectKey: "p3", projectName: "Zero", rating: 0 },
			],
		});
		expect(await loadProjectList(fetch, ENDPOINTS)).toEqual([
			{ key: "p2", name: "Commons", rating: 58.3 },
			{ key: "p1", name: "Waterways", rating: 55.7 },
			{ key: "p3", name: "Zero", rating: 0 },
		]);
	});

	it("resolves to [] on a failed response", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(loadProjectList(fetchReturning({}, false), ENDPOINTS)).resolves.toEqual([]);
	});
});

describe("loadMostViewed", () => {
	it("asks the counter for the tab and keeps its order, keys and names", async () => {
		const fetch = fetchReturning({ tab: "orgs", hits: [{ key: "b", name: "Birch" }, { key: "a", name: "Alder" }] });
		expect(await loadMostViewed(fetch, { searchHits: "/api/search/hits" }, "orgs")).toEqual([
			{ key: "b", name: "Birch", rating: null },
			{ key: "a", name: "Alder", rating: null },
		]);
		expect(fetch.mock.calls[0][0]).toBe("/api/search/hits?tab=orgs");
	});

	it("asks nothing without the endpoint, and resolves to [] on a failed response", async () => {
		const fetch = fetchReturning({});
		expect(await loadMostViewed(fetch, {}, "projects")).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
		vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(loadMostViewed(fetchReturning({}, false), { searchHits: "/x" }, "projects")).resolves.toEqual([]);
	});

	it("stays quiet when leaving the page aborts it", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const leaving = new AbortController();
		leaving.abort();
		const fetch = vi.fn(async () => {
			throw new TypeError("Failed to fetch");
		}) as unknown as typeof globalThis.fetch;
		await expect(loadMostViewed(fetch, { searchHits: "/x" }, "orgs", leaving.signal)).resolves.toEqual([]);
		expect(error).not.toHaveBeenCalled();
	});
});
