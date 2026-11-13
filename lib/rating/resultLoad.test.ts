import { describe, expect, it, vi } from "vitest";
import { loadOrganization, loadProject, rankWords } from "./resultLoad";
import type { WhoWhatEndpoints, WhoWhatFail } from "../whoWhatTypes";

const lang = vi.hoisted(() => ({ locale: "en" }));
vi.mock(import("$parent/src/lib/paraglide/runtime"), async (actual) => ({ ...(await actual()), getLocale: () => lang.locale as never }));

const inLocale = (locale: string, f: () => void) => {
	lang.locale = locale;
	try {
		f();
	} finally {
		lang.locale = "en";
	}
};

describe("an org's rank in words", () => {
	it("says the place by the language's ordinals", () => {
		const places = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((place) => rankWords({ place, of: 120, category: "developer_ish" }));
		expect(places).toEqual([
			"1st of 120 developers",
			"2nd of 120 developers",
			"3rd of 120 developers",
			"4th of 120 developers",
			"11th of 120 developers",
			"12th of 120 developers",
			"13th of 120 developers",
			"21st of 120 developers",
			"22nd of 120 developers",
			"23rd of 120 developers",
			"101st of 120 developers",
		]);
	});

	it("names the category in the plural the count asks for", () => {
		expect(rankWords({ place: 1, of: 1, category: "landowner_ish" })).toBe("1st of 1 landowner");
		expect(rankWords({ place: 22, of: 30, category: "producer_ish" })).toBe("22nd of 30 nurseries and growers");
		expect(rankWords({ place: 3, of: 7, category: "marketplace_ish" })).toBe("3rd of 7 listing platforms");
		expect(rankWords({ place: 1, of: 2, category: "sponsor_ish" })).toBe("1st of 2 funders");
		expect(rankWords({ place: 2, of: 4, category: "research_ish" })).toBe("2nd of 4 research partners");
	});

	it("ranks an org with no main role among the others with none, and an unknown role among its kind", () => {
		expect(rankWords({ place: 1, of: 2, category: null })).toBe("1st of 2 organizations without a main role");
		expect(rankWords({ place: 2, of: 5, category: "brand_new_ish" })).toBe("2nd of 5 organizations of its kind");
	});

	it("speaks es, pt-BR and fr", () => {
		inLocale("es", () => expect(rankWords({ place: 3, of: 46, category: "developer_ish" })).toBe("3.º de 46 desarrolladores"));
		inLocale("pt-BR", () => expect(rankWords({ place: 3, of: 46, category: "developer_ish" })).toBe("3º de 46 desenvolvedores"));
		inLocale("fr", () => {
			expect(rankWords({ place: 3, of: 46, category: "developer_ish" })).toBe("3e sur 46 développeurs");
			expect(rankWords({ place: 1, of: 2, category: null })).toBe("1er sur 2 organisations sans rôle principal");
		});
	});
});

describe("the record's rank", () => {
	const endpoints = { organization: (k: string) => `/org/${k}`, project: (k: string) => `/project/${k}` } as WhoWhatEndpoints;
	const fail = ((status: number, message: string) => new Error(`${status} ${message}`)) as WhoWhatFail;
	const answering = (body: unknown) => (async () => new Response(JSON.stringify(body))) as typeof fetch;
	const org = (extra: Record<string, unknown>) =>
		answering({
			organization: { organizationKey: "c-c", organizationName: "restor.eco", rating: 71.4, cohort: "unreviewed", primaryStakeholderCategoryName: "Developer", ...extra },
			scoreRunId: "run-1",
		});

	it("reads rank, rankOf and category off the org answer", async () => {
		const r = await loadOrganization(org({ rank: 3, rankOf: 46, category: "developer_ish" }), "c-c", endpoints, fail);
		expect(r.rank).toEqual({ place: 3, of: 46, category: "developer_ish" });
	});

	it("keeps an uncategorised org's rank, with no category", async () => {
		const r = await loadOrganization(org({ rank: 1, rankOf: 2, category: null }), "c-c", endpoints, fail);
		expect(r.rank).toEqual({ place: 1, of: 2, category: null });
	});

	it("has no rank when unranked or when the numbers cannot be a place", async () => {
		for (const extra of [{ rank: null, rankOf: null, category: null }, {}, { rank: 0, rankOf: 3 }, { rank: 4, rankOf: 3 }, { rank: 1.5, rankOf: 3 }]) {
			expect((await loadOrganization(org(extra), "c-c", endpoints, fail)).rank).toBeNull();
		}
	});

	it("gives a project none", async () => {
		const r = await loadProject(answering({ project: { projectKey: "p", projectName: "P", rating: 56 }, scoreRunId: null }), "p", endpoints, fail);
		expect(r.rank).toBeUndefined();
	});
});
