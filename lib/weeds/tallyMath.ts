// The tally's arithmetic: the running sums through the lit tab, the count's
// easing, and the words each table gets. Pure, so the corner and the phone
// strip draw one truth.
import { WEEDS_TABLES, type ScoreTally, type TallyLine, type WeedsTable } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";

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

export type Targets = { scored: number; available: number; big: number };

/**
 * What the ledger counts to with `index` lit. The last tab lands on the stored
 * totals and the hero's number, not the tables' sum: some points fall outside
 * the seven tables. An org's big figure holds its projects' mean until then.
 */
export function tallyTargets(tally: ScoreTally, index: number): Targets {
	const sums = sumsThrough(tally.tables, index);
	if (index >= WEEDS_TABLES.length - 1) {
		return {
			scored: tally.pointsScored ?? sums.scored,
			available: tally.pointsAvailable ?? sums.available,
			big: tally.rating ?? sums.pct ?? 0,
		};
	}
	const big = tally.kind === "org" ? (tally.org?.mean ?? tally.rating) : sums.pct;
	return { scored: sums.scored, available: sums.available, big: big ?? 0 };
}

/** A table's share filled, 0–1; null where nothing was on offer, so it gets no bar. */
export function barFill(line: TallyLine, index: number, lit: number): number | null {
	if (line.available === 0) return null;
	return index > lit ? 0 : Math.min(1, line.awarded / line.available);
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

// Getters, so each read speaks the request's language; SSR shares this module across locales.
export const TABLE_LABELS: Readonly<Record<WeedsTable, string>> = {
	get projects() { return m.ww_rating_table_projects(); },
	get crop() { return m.ww_rating_table_crop(); },
	get planting() { return m.ww_rating_table_planting(); },
	get land() { return m.ww_rating_table_land(); },
	get polymorphic() { return m.ww_rating_table_polymorphic(); },
	get stakeholders() { return m.ww_rating_table_stakeholders(); },
	get sources() { return m.ww_rating_table_sources(); },
};

/** What each table's points are scored on, for the corner's last line. */
export const TABLE_SCORES: Readonly<Record<WeedsTable, string>> = {
	get projects() { return m.ww_rating_table_scores_projects(); },
	get crop() { return m.ww_rating_table_scores_crop(); },
	get planting() { return m.ww_rating_table_scores_planting(); },
	get land() { return m.ww_rating_table_scores_land(); },
	get polymorphic() { return m.ww_rating_table_scores_polymorphic(); },
	get stakeholders() { return m.ww_rating_table_scores_stakeholders(); },
	get sources() { return m.ww_rating_table_scores_sources(); },
};
