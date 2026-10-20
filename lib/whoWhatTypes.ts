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

/** How a cell is drawn; the answer says, so the page never knows the schema. */
export type WeedsKind = "text" | "number" | "date" | "link" | "score";
export type WeedsColumn = { key: string; label: string; kind: WeedsKind };
export type WeedsRow = Record<string, string | number | null>;
/** One table's answer from the host: rows capped, `total` not. */
export type WeedsAnswer = {
	table: WeedsTable;
	columns: WeedsColumn[];
	rows: WeedsRow[];
	total: number;
};

/** The host's API surface; an absent endpoint skips the fetch. */
export type WhoWhatEndpoints = {
	organizations?: string;
	projects?: string;
	organization?: (key: string) => string;
	project?: (key: string) => string;
	/** Search-hit analytics: GET top keys per tab, POST a landing. Absent → alphabetical, nothing logged. */
	searchHits?: string;
	/** One weeds table of a record. Absent → the weeds section does not render. */
	weeds?: (tab: "orgs" | "projects", key: string, table: WeedsTable) => string;
	/** Where the frame clips (the dog, the page animations) and their clips.json are served from. Absent → no clip plays. */
	clipRoot?: string;
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
	/** How the rating works; the rating page's info button. */
	why?: string;
	whoOrg?: (key: string) => string;
	whatProject?: (key: string) => string;
};
