import { describe, expect, it, vi } from "vitest";
import { loadOrganization, loadProject, rankUnits, rankWords } from "./resultLoad";
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
		const places = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((place) => rankWords({ place, of: 120, category: "developer_ish", overall: null }));
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
		expect(rankWords({ place: 1, of: 1, category: "landowner_ish", overall: null })).toBe("1st of 1 landowner");
		expect(rankWords({ place: 22, of: 30, category: "producer_ish", overall: null })).toBe("22nd of 30 nurseries and growers");
		expect(rankWords({ place: 3, of: 7, category: "marketplace_ish", overall: null })).toBe("3rd of 7 listing platforms");
		expect(rankWords({ place: 1, of: 2, category: "sponsor_ish", overall: null })).toBe("1st of 2 funders");
		expect(rankWords({ place: 2, of: 4, category: "research_ish", overall: null })).toBe("2nd of 4 research partners");
	});

	it("ranks an org with no main role among the others with none, and an unknown role among its kind", () => {
		expect(rankWords({ place: 1, of: 2, category: null, overall: null })).toBe("1st of 2 organizations without a main role");
		expect(rankWords({ place: 2, of: 5, category: "brand_new_ish", overall: null })).toBe("2nd of 5 organizations of its kind");
	});

	it("adds the org's place among every ranked org when the answer has it", () => {
		const rank = { place: 22, of: 46, category: "developer_ish", overall: { place: 41, of: 87 } };
		expect(rankWords(rank)).toBe("22nd of 46 developers · 41st of 87 overall");
		inLocale("es", () => expect(rankWords(rank)).toBe("22.º de 46 desarrolladores · 41.º de 87 en total"));
		inLocale("pt-BR", () => expect(rankWords(rank)).toBe("22º de 46 desenvolvedores · 41º de 87 no geral"));
		inLocale("fr", () => expect(rankWords(rank)).toBe("22e sur 46 développeurs · 41e sur 87 au total"));
	});

	it("says one place when a group too small ranks the org among all, never repeating it as overall", () => {
		const rank = { place: 34, of: 86, category: "all", overall: { place: 34, of: 86 } };
		expect(rankWords(rank)).toBe("34th of 86 organizations");
		expect(rankWords({ ...rank, overall: null })).toBe("34th of 86 organizations");
		inLocale("es", () => expect(rankWords(rank)).toBe("34.º de 86 organizaciones"));
		inLocale("pt-BR", () => expect(rankWords(rank)).toBe("34º de 86 organizações"));
		inLocale("fr", () => {
			expect(rankWords(rank)).toBe("34e sur 86 organisations");
			expect(rankWords({ place: 1, of: 86, category: "all", overall: null })).toBe("1er sur 86 organisations");
		});
	});

	it("cuts each place into numerals, ordinal ending and caption, in every language", () => {
		const rank = { place: 22, of: 46, category: "developer_ish", overall: { place: 52, of: 87 } };
		const cut = () => rankUnits(rank).map(({ lead, digits, suffix, caption }) => [lead, digits, suffix, caption]);
		expect(cut()).toEqual([
			["", "22", "nd", "of 46 developers"],
			["", "52", "nd", "of 87 overall"],
		]);
		inLocale("es", () => expect(cut()[0]).toEqual(["", "22.", "º", "de 46 desarrolladores"]));
		inLocale("pt-BR", () => expect(cut()[1]).toEqual(["", "52", "º", "de 87 no geral"]));
		inLocale("fr", () => expect(cut()[0]).toEqual(["", "22", "e", "sur 46 développeurs"]));
		expect(rankUnits({ ...rank, category: "all", place: 70, of: 86 }).map((u) => u.sentence)).toEqual(["70th of 86 organizations"]);
	});

	it("speaks es, pt-BR and fr", () => {
		inLocale("es", () => expect(rankWords({ place: 3, of: 46, category: "developer_ish", overall: null })).toBe("3.º de 46 desarrolladores"));
		inLocale("pt-BR", () => expect(rankWords({ place: 3, of: 46, category: "developer_ish", overall: null })).toBe("3º de 46 desenvolvedores"));
		inLocale("fr", () => {
			expect(rankWords({ place: 3, of: 46, category: "developer_ish", overall: null })).toBe("3e sur 46 développeurs");
			expect(rankWords({ place: 1, of: 2, category: null, overall: null })).toBe("1er sur 2 organisations sans rôle principal");
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
		expect(r.rank).toEqual({ place: 3, of: 46, category: "developer_ish", overall: null });
	});

	it("reads the overall place beside it, and drops one that cannot be a place", async () => {
		const both = await loadOrganization(org({ rank: 22, rankOf: 46, category: "developer_ish", rankOverall: 41, rankOverallOf: 87 }), "c-c", endpoints, fail);
		expect(both.rank?.overall).toEqual({ place: 41, of: 87 });
		const bad = await loadOrganization(org({ rank: 22, rankOf: 46, category: "developer_ish", rankOverall: 90, rankOverallOf: 87 }), "c-c", endpoints, fail);
		expect(bad.rank?.overall).toBeNull();
	});

	it("keeps the all group an undersized category falls back to", async () => {
		const r = await loadOrganization(org({ rank: 34, rankOf: 86, category: "all", rankOverall: 34, rankOverallOf: 86 }), "c-c", endpoints, fail);
		expect(r.rank).toEqual({ place: 34, of: 86, category: "all", overall: { place: 34, of: 86 } });
	});

	it("keeps an uncategorised org's rank, with no category", async () => {
		const r = await loadOrganization(org({ rank: 1, rankOf: 2, category: null }), "c-c", endpoints, fail);
		expect(r.rank).toEqual({ place: 1, of: 2, category: null, overall: null });
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
