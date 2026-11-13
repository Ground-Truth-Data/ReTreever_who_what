import type { WhoWhatEndpoints, WhoWhatFail } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

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
	/** An org's place among its cohort and primary category; null for a project, or unranked. */
	rank?: Rank | null;
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

/**
 * `category` is the role id ("developer_ish"); null ranks the org among those with no main role. `overall` is its
 * place among every ranked org, null when the answer has none.
 */
export type Rank = { place: number; of: number; category: string | null; overall: { place: number; of: number } | null };

/** One org as the record endpoint answers the fields this page asks for. */
export type OrgRow = {
	organizationKey: string;
	organizationName: string;
	/** The published percentile, 0–100. */
	rating: number | null;
	cohort: Cohort | null;
	primaryStakeholderCategoryName: string | null;
	rank: number | null;
	rankOf: number | null;
	category: string | null;
	rankOverall: number | null;
	rankOverallOf: number | null;
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
	const fields = "organizationKey,organizationName,rating,cohort,primaryStakeholderCategory,rank,rankOf,category,rankOverall,rankOverallOf";
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
		rank: rankOf(org),
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

const whole = (n: unknown): number | null => (typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null);

const placeOf = (rank: unknown, of: unknown): { place: number; of: number } | null => {
	const p = whole(rank);
	const n = whole(of);
	return p === null || n === null || p > n ? null : { place: p, of: n };
};

function rankOf(org: Partial<Pick<OrgRow, "rank" | "rankOf" | "category" | "rankOverall" | "rankOverallOf">>): Rank | null {
	const inCategory = placeOf(org.rank, org.rankOf);
	if (!inCategory) return null;
	const category = typeof org.category === "string" && org.category ? org.category : null;
	return { ...inCategory, category, overall: placeOf(org.rankOverall, org.rankOverallOf) };
}

const ORDINALS = {
	one: m.ww_rating_ordinal_one,
	two: m.ww_rating_ordinal_two,
	few: m.ww_rating_ordinal_few,
	other: m.ww_rating_ordinal_other,
} as const;

// Keyed by StakeholderCategoryTable ids, as the where drawer's role words are; an id with none here reads "of its kind".
const RANK_WORDS: Record<string, typeof m.ww_rating_rank_developer> = {
	developer_ish: m.ww_rating_rank_developer,
	producer_ish: m.ww_rating_rank_producer,
	landowner_ish: m.ww_rating_rank_landowner,
	sponsor_ish: m.ww_rating_rank_sponsor,
	marketplace_ish: m.ww_rating_rank_marketplace,
	research_ish: m.ww_rating_rank_research,
};

/** "3rd of 46 developers · 41st of 87 overall"; es "3.º de 46 desarrolladores", fr "3e sur 46 développeurs". */
export const rankWords = (rank: Rank): string => rankPhrases(rank).join(" · ");

/** The category place, then the overall one when there is one: each a phrase a line may break between, never inside. */
export function rankPhrases(rank: Rank): string[] {
	const locale = getLocale();
	const ordinal = new Intl.PluralRules(locale, { type: "ordinal" });
	const count = new Intl.NumberFormat(locale);
	const placeWords = (n: number) => (ORDINALS[ordinal.select(n) as keyof typeof ORDINALS] ?? ORDINALS.other)({ rank: n });
	const words = rank.category === null ? m.ww_rating_rank_none : (RANK_WORDS[rank.category] ?? m.ww_rating_rank_other);
	const inCategory = words({ place: placeWords(rank.place), total: rank.of, shown: count.format(rank.of) });
	if (!rank.overall) return [inCategory];
	return [inCategory, m.ww_rating_rank_overall({ place: placeWords(rank.overall.place), shown: count.format(rank.overall.of) })];
}
