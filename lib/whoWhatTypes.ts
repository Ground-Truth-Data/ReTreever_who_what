import { getLocale } from "$parent/src/lib/paraglide/runtime";

/** Raw 0–1 score (a Prisma Decimal string) → 0–100 to one decimal; null, not 0, when unscored. */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	// An org's stored score can pass 1 (an uncapped disclosure ratio); the shown number never leaves 0–100.
	return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 1000) / 10)) : null;
}

/** "73.3%" (fr "73,3 %") or "—"; coerces because Mapbox hands properties back as strings. */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	if (!Number.isFinite(n)) return "—";
	// Rounded by toFixed first: Intl rounds a halfway hundredth the other way, and English must not move.
	const percent = new Intl.NumberFormat(getLocale(), { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
	return percent.format(Number(n.toFixed(1)) / 100);
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

/** How a stored score adds up, from the host's `/score` route: the seven tables in `WEEDS_TABLES` order, then an org's mean and claims. */
export type ScoreTally = {
	kind: "project" | "org";
	/** False → every number below is null and no tally is drawn. */
	scored: boolean;
	/** 0–100 to one decimal, the hero's number. */
	rating: number | null;
	/** The stored totals, never recomputed. */
	pointsScored: number | null;
	pointsAvailable: number | null;
	/** Trees the record has published: a project's planting rows summed, an org's stored sum. Null when unknown. */
	planted: number | null;
	/** What the sticker under the number shows: trees, else hectares, else hectares mapped, else sites; null when none is above 0. */
	measure: { kind: "trees" | "hectares" | "hectaresMapped" | "sites"; value: number } | null;
	tables: { table: WeedsTable; awarded: number; available: number }[];
	/** An org's step from the tables to its number; `projects` 0 means the score was not broken down. */
	org?: { projects: number; mean: number | null; claimed: number | null; planted: number | null; undisclosed: number | null };
};

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
	/** Search-hit analytics: POST a landing. Absent → nothing logged. */
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
