// The tally's arithmetic: the stack of figures from the attributes on offer to
// the rating, each table's line, the count's easing, and each figure's words.
// Pure, so the card and the phone strip draw one truth.
import { WEEDS_TABLES, type ScoreTally, type TallyLine, type WeedsTable } from "../whoWhatTypes";
import { fullCount } from "./weedsFormat";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

export const LAST_TABLE = WEEDS_TABLES.length - 1;

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

/** What the screen reader hears as `index` lights: the running points, the stored totals on the last tab (some points fall outside the seven tables). */
export function runningPoints(tally: ScoreTally, index: number): { scored: number; available: number } {
	const sums = sumsThrough(tally.tables, index);
	if (index < LAST_TABLE) return sums;
	return { scored: tally.pointsScored ?? sums.scored, available: tally.pointsAvailable ?? sums.available };
}

export type StackKey = "possible" | "filled" | "share" | "claim" | "place" | "rating";
export type StackRow = { key: StackKey; value: string };

const DASH = "—";
// The reader's decimal mark: "85,7" in French.
const decimal = (n: number, digits: number) =>
	new Intl.NumberFormat(getLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }).format(n);
const ratioText = (r: number) => (r >= 1 ? "1" : decimal(r, 2));

/** An org's claim step as a multiplier: a reviewed claim's planted ÷ claimed, else × 1. A project has no claim step. */
export function claimFactor(tally: ScoreTally): string {
	if (tally.kind === "project") return DASH;
	const ratio = tally.org?.reviewed ? tally.org.ratio : null;
	return ratio === null || ratio === undefined ? "× 1" : `× ${ratioText(ratio)}`;
}

/**
 * The card's six figures, top to bottom, every one final from the first
 * paint: what is on offer, what is filled, the share, the claim step, the
 * place among peers, the rating. A figure the record has none of reads "—".
 */
export function stackRows(tally: ScoreTally): StackRow[] {
	const counts = tally.attributes;
	const share =
		counts && counts.possible > 0
			? new Intl.NumberFormat(getLocale(), { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
					counts.filled / counts.possible,
				)
			: DASH;
	const place = tally.place;
	return [
		{ key: "possible", value: counts ? fullCount(counts.possible) : DASH },
		{ key: "filled", value: counts ? fullCount(counts.filled) : DASH },
		{ key: "share", value: share },
		{ key: "claim", value: claimFactor(tally) },
		{ key: "place", value: place ? m.ww_rating_tally_rank({ rank: fullCount(place.rank), count: fullCount(place.of) }) : DASH },
		{ key: "rating", value: tally.rating === null ? DASH : decimal(tally.rating, 1) },
	];
}

/** The card's finished state: the hero's number has landed and the reader is on the last table. */
export function tallyDone(tally: ScoreTally, litIndex: number, landed: boolean): boolean {
	return landed && litIndex >= LAST_TABLE && tally.tables.length > 0;
}

const PEERS: Record<string, () => string> = {
	developer_ish: m.ww_rating_trace_peers_developer_ish,
	landowner_ish: m.ww_rating_trace_peers_landowner_ish,
	producer_ish: m.ww_rating_trace_peers_producer_ish,
	research_ish: m.ww_rating_trace_peers_research_ish,
	supplier_ish: m.ww_rating_trace_peers_supplier_ish,
	ngo_ish: m.ww_rating_trace_peers_ngo_ish,
	marketplace_ish: m.ww_rating_trace_peers_marketplace_ish,
	nursery_ish: m.ww_rating_trace_peers_nursery_ish,
	sponsor_ish: m.ww_rating_trace_peers_sponsor_ish,
	all: m.ww_rating_trace_peers_all,
};

/** An org's peer group as the trace page and the tally both name it. */
export const peersOf = (group: string | null) => (group && PEERS[group] ? PEERS[group]() : m.ww_rating_trace_peers_none());

/** The place row's heading and its place line, or null when the record is not ranked. */
export function placeLine(tally: ScoreTally): { among: string; ranked: string; place: string; short: string } | null {
	const place = tally.place;
	if (!place) return null;
	const group = place.group;
	const peers =
		tally.kind === "project" ? m.ww_rating_tally_peers_projects() : peersOf(group);
	const count = fullCount(place.of);
	const rank = fullCount(place.rank);
	const all = tally.kind === "project" || group === "all";
	return {
		among: all ? m.ww_rating_tally_among_all({ count, peers }) : m.ww_rating_tally_among({ count, peers }),
		ranked: all ? m.ww_rating_hero_ranked_all({ count, peers }) : m.ww_rating_hero_ranked({ count, peers }),
		place: m.ww_rating_trace_place({ rank, count }),
		short: m.ww_rating_tally_place_among({ rank, count, peers }),
	};
}

/** A table's share filled, 0–1; null where nothing was on offer, so it gets no bar. */
export function lineFill(line: TallyLine): number | null {
	return line.available === 0 ? null : Math.min(1, line.awarded / line.available);
}

/**
 * One table's line at `k` of its count (0–1): every line reads its final
 * figure, the active one counts its points up to it. A dash where nothing was
 * on offer.
 */
export function lineValue(line: TallyLine, k = 1): "–" | { awarded: number; available: number; fill: number } {
	const fill = lineFill(line);
	if (fill === null) return "–";
	const t = Math.min(1, Math.max(0, k));
	return { awarded: line.awarded * t, available: line.available, fill: fill * t };
}

/** Cubic ease-out between two figures; `t` is clamped to 0–1. */
export function tween(from: number, to: number, t: number): number {
	const k = Math.min(1, Math.max(0, t));
	return from + (to - from) * (1 - (1 - k) ** 3);
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
