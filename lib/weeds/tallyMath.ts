// The tally's arithmetic: the running sums through the lit tab, the count's
// easing, and the words each table gets. Pure, so the corner and the phone
// strip draw one truth.
import type { WeedsTable } from "../whoWhatTypes";

export type TallyLine = { table: WeedsTable; awarded: number; available: number };
export type Sums = { scored: number; available: number; pct: number | null };

/** Points through the tab at `index` inclusive; `pct` is 0–100 to one decimal, null with nothing on offer yet. */
export function sumsThrough(tables: TallyLine[], index: number): Sums {
	let scored = 0;
	let available = 0;
	for (const t of tables.slice(0, index + 1)) {
		scored += t.awarded;
		available += t.available;
	}
	return { scored, available, pct: available > 0 ? Math.round((scored / available) * 1000) / 10 : null };
}

/** Cubic ease-out between two figures; `t` is clamped to 0–1. */
export function tween(from: number, to: number, t: number): number {
	const k = Math.min(1, Math.max(0, t));
	return from + (to - from) * (1 - (1 - k) ** 3);
}

/** What the ladder shows for one line: nothing yet past the lit tab, a dash where no points were on offer. */
export function ladderValue(line: TallyLine, index: number, lit: number): "·" | "–" | { awarded: number; available: number } {
	if (index > lit) return "·";
	if (line.available === 0) return "–";
	return { awarded: line.awarded, available: line.available };
}

export const TABLE_LABELS: Record<WeedsTable, string> = {
	projects: "Projects",
	crop: "Crop",
	planting: "Planting",
	land: "Land",
	polymorphic: "Polymorphic",
	stakeholders: "Stakeholders",
	sources: "Sources",
};

/** What each table's points are scored on, for the corner's last line. */
export const TABLE_SCORES: Record<WeedsTable, string> = {
	projects: "the record's own fields",
	crop: "species and crop names",
	planting: "planting rows and their counts",
	land: "plots and their polygons",
	polymorphic: "the misc fields",
	stakeholders: "stakeholder categories",
	sources: "where the record came from",
};
