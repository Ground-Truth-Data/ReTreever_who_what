import { getLocale } from "$parent/src/lib/paraglide/runtime";
import { m } from "$parent/src/lib/paraglide/messages";

/**
 * A rating, which is out of 100 and never a percent: "73.3" (fr "73,3") or "—". Coerces because Mapbox hands
 * properties back as strings. ReTreever_where's `whereTypes.ts` keeps a twin (a child cannot import another);
 * ReTreever's `pageMeta.test.ts` pins the two equal.
 */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	if (!Number.isFinite(n)) return "—";
	// Rounded by toFixed first: Intl rounds a halfway hundredth the other way, and English must not move.
	const oneDecimal = new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
	return oneDecimal.format(Number(n.toFixed(1)));
}

/** "73.3 out of 100" (fr "73,3 sur 100"), or "—": a rating as text and speech say it. */
export function formatRatingOutOf(score: unknown): string {
	const shown = formatTransparencyScore(score);
	return shown === "—" ? shown : m.ww_rating_out_of({ rating: shown });
}

/** The seven tables under a rating, in strip order. */
export const WEEDS_TABLES = [
	"projects",
	"crop",
	"planting",
	"land",
	"polymorphic",
	"stakeholders",
	"sources",
] as const;
export type WeedsTable = (typeof WEEDS_TABLES)[number];

/**
 * How a cell is drawn; the answer says, so the page never knows the schema. A `key` column is never drawn: it is what
 * opens a row; nor is `dead`, the date the row's link answered 404/410; nor `aside`, which rides in the cell of the
 * column naming it: a `money` cell's currency, a `points` cell's points available, a `site`'s id.
 */
export type WeedsKind = "text" | "number" | "date" | "link" | "score" | "key" | "dead" | "money" | "points" | "site" | "aside";
/** `optional`: drawn only when a row has it, and never listed as not published. */
export type WeedsColumn = { key: string; label: string; kind: WeedsKind; aside?: string; optional?: true };
export type WeedsRow = Record<string, string | number | null>;
/** One table's answer from the host: `total` is `rows.length`; `more` says the cap cut it short; `platforms` are the rows' sources, named once. */
export type WeedsAnswer = {
	table: WeedsTable;
	columns: WeedsColumn[];
	rows: WeedsRow[];
	platforms: string[];
	total: number;
	more: boolean;
};

/** One weeds table's points in a tally. */
export type TallyLine = { table: WeedsTable; awarded: number; available: number };

/** The host's `/score` answer: how a published score adds up, the seven tables in `WEEDS_TABLES` order, then an org's mean and claims. */
export type ScoreAnswer = {
	kind: "project" | "org";
	/** False → every number below is null and no tally is drawn. */
	scored: boolean;
	/** The published percentile, 0–100 to one decimal: the hero's number, where the ledger lands. */
	rating: number | null;
	/** The score the tables add up to, 0–100 to one decimal; for an org, after claims. */
	score: number | null;
	/** The stored totals, never recomputed. */
	pointsScored: number | null;
	pointsAvailable: number | null;
	/** Trees the record has published: a project's planting rows summed, an org's stored sum. Null when unknown. */
	planted: number | null;
	/** What the sticker under the number shows: trees, else hectares, else hectares mapped, else sites; null when none is above 0. */
	measure: { kind: "trees" | "hectares" | "hectaresMapped" | "sites"; value: number } | null;
	/** Null when this row's breakdown did not reconcile with its stored points when the run froze: it is not drawn. */
	tables: TallyLine[] | null;
	/** An org's step from the tables to its number; `projects` is the N of "mean of N", 0 when nothing was broken down. */
	org?: { projects: number; mean: number | null; claimed: number | null; planted: number | null; undisclosed: number | null };
	/** The published run the answer was read from; null before a first publish. */
	scoreRunId: string | null;
	/** Whether this row's breakdown reached its stored points when the run froze; null before a first publish. */
	reconciled: boolean | null;
};

/** A tally the page draws: a scored answer whose breakdown reconciled. */
export type ScoreTally = ScoreAnswer & { tables: TallyLine[] };

/** Who a reader says they are, in the feedback form's order; the host words each for the mail. */
export const FEEDBACK_ROLES = ["official", "organization", "researcher", "funder", "other"] as const;
export type FeedbackRole = (typeof FEEDBACK_ROLES)[number];

/** What the page posts to the host's feedback endpoint. `website` is the honeypot: a person leaves it empty. */
export type FeedbackBody = {
	message?: string;
	email?: string;
	role?: FeedbackRole;
	website?: string;
	url?: string;
	locale?: string;
	record?: { kind: "org" | "project"; key: string; name: string; rating: number | null; tab?: WeedsTable };
	report?: { errorId?: string; status: number };
};

/** The host's API surface; an absent endpoint skips the fetch. */
export type WhoWhatEndpoints = {
	organizations?: string;
	projects?: string;
	organization?: (key: string) => string;
	project?: (key: string) => string;
	/** Search hits: POST a landing; GET ?tab= answers the most viewed. Absent → nothing logged, no most-viewed rows. */
	searchHits?: string;
	/** One weeds table of a record. Absent → the weeds section does not render. */
	weeds?: (tab: "orgs" | "projects", key: string, table: WeedsTable) => string;
	/** How a record's score adds up. Absent → no tally beside the weeds. */
	score?: (tab: "orgs" | "projects", key: string) => string;
	/** POST a reader's feedback on the record (a `FeedbackBody`). Absent → no feedback line on the rating page. */
	feedback?: string;
	/** The address a reader can write to when a send fails; named in the copied message. */
	feedbackAddress?: string;
	/** Where the frame clips (the dog, the page animations) and their clips.json are served from. Absent → no clip plays. */
	clipRoot?: string;
	/** The dog's clips cut to its stage window and sized for a phone, with their own clips.json. Absent → phones crop clipRoot's frames. */
	stageClipRoot?: string;
	/** The dog's clips cut to its stage window at the window's own size, with their own clips.json. Absent → wider screens crop clipRoot's frames. */
	windowClipRoot?: string;
	/** The dog's walk on cut on past its stage window's right edge, native size, with its own clips.json. Absent → it walks in at the stage's edge. */
	reachClipRoot?: string;
};

// The host's `error`: a standalone child has no @sveltejs/kit to import it from.
// Required, so a host that forgets it fails to compile.
export type WhoWhatFail = (status: number, message: string) => never;

/** The host's URL map. Absent → the page renders without those links. */
export type WhoWhatRoutes = {
	who?: string;
	what?: string;
	/** The map, from the search and rating pages' globe. */
	whoMap?: string;
	whoOrg?: (key: string) => string;
	whatProject?: (key: string) => string;
};
