import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOrgList, loadProjectList } from "./searchLists";

const ENDPOINTS = { organizations: "/api/who/organizations", projects: "/api/what/projects" };

function fetchReturning(body: unknown, ok = true) {
	const fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));
	return fetch as unknown as typeof globalThis.fetch & ReturnType<typeof vi.fn>;
}

afterEach(() => vi.restoreAllMocks());

describe("loadOrgList", () => {
	it("asks for the key, name, category and final score in one request", async () => {
		const fetch = fetchReturning({ organizations: [] });
		await loadOrgList(fetch, ENDPOINTS);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			"/api/who/organizations?fields=organizationKey,organizationName,primaryStakeholderCategory,scoreOrgFinal",
		);
	});

	it("maps a row to key, name, hint and a 0–100 rating, best first and unscored last", async () => {
		const fetch = fetchReturning({
			organizations: [
				{ organizationKey: "a", organizationName: "Aaranyak", primaryStakeholderCategoryName: "Developer", scoreOrgFinal: "0.5938697318007663" },
				{ organizationKey: "b", organizationName: "Bare", primaryStakeholderCategoryName: null, scoreOrgFinal: null },
				{ organizationKey: "c", organizationName: "Canopy", primaryStakeholderCategoryName: "Funder", scoreOrgFinal: "0.8525603122043519" },
				{ organizationKey: "d", organizationName: "Dune", primaryStakeholderCategoryName: null, scoreOrgFinal: "0.59387" },
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

describe("loadProjectList", () => {
	it("asks for scored projects with key, name and score in one request", async () => {
		const fetch = fetchReturning({ projects: [] });
		await loadProjectList(fetch, ENDPOINTS);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith("/api/what/projects?scored=true&fields=projectKey,projectName,scoreProject");
	});

	it("maps a row to key, name and rating, best first", async () => {
		const fetch = fetchReturning({
			projects: [
				{ projectKey: "p1", projectName: "Waterways", scoreProject: "0.5571428571428572" },
				{ projectKey: "p2", projectName: "Commons", scoreProject: "0.5833333333333334" },
				{ projectKey: "p3", projectName: "Zero", scoreProject: "0" },
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
