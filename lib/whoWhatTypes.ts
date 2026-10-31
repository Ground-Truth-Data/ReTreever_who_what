/** Raw 0–1 score (a Prisma Decimal string) → 0–100 to one decimal; null, not 0, when unscored. */
export function toTransparencyScore(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.round(n * 1000) / 10 : null;
}

/** "73.3%" or "—"; coerces because Mapbox hands properties back as strings. */
export function formatTransparencyScore(score: unknown): string {
	const n = Number(score);
	return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
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

/** How a cell is drawn; the answer says, so the page never knows the schema. A `key` column is never drawn: it is what opens a row. */
export type WeedsKind = "text" | "number" | "date" | "link" | "score" | "key";
export type WeedsColumn = { key: string; label: string; kind: WeedsKind };
export type WeedsRow = Record<string, string | number | null>;
/** One table's answer from the host: `total` is `rows.length`; `more` says the cap cut it short. */
export type WeedsAnswer = {
	table: WeedsTable;
	columns: WeedsColumn[];
	rows: WeedsRow[];
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
	tables: { table: WeedsTable; awarded: number; available: number }[];
	/** An org's step from the tables to its number; `projects` 0 means the score was not broken down. */
	org?: { projects: number; mean: number | null; claimed: number | null; planted: number | null; undisclosed: number | null };
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
	/** Where the frame clips (the dog, the page animations) and their clips.json are served from. Absent → no clip plays. */
	clipRoot?: string;
	/** The dog's clips cut to its stage window and sized for a phone, with their own clips.json. Absent → phones crop clipRoot's frames. */
	stageClipRoot?: string;
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
