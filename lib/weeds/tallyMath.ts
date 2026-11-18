// The tally's arithmetic: the running sums through the lit tab, the count's
// easing, the walk from the last table to the rating, and each step's words.
// Pure, so the card and the phone strip draw one truth.
import { WEEDS_TABLES, type ScoreTally, type TallyLine, type WeedsTable } from "../whoWhatTypes";
import { fullCount } from "./weedsFormat";
import { m } from "$parent/src/lib/paraglide/messages";

const LAST = WEEDS_TABLES.length - 1;

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
 * What the dig counts to with `index` lit: the running share, then on the
 * last tab the stored totals and the first step's figure, not the tables'
 * sum: some points fall outside the seven tables.
 */
export function tallyTargets(tally: ScoreTally, index: number): Targets {
	const sums = sumsThrough(tally.tables, index);
	if (index >= LAST) {
		return {
			scored: tally.pointsScored ?? sums.scored,
			available: tally.pointsAvailable ?? sums.available,
			big: stepFigure(tally, "points"),
		};
	}
	return { scored: sums.scored, available: sums.available, big: sums.pct ?? 0 };
}

/** The walk from the last table to the hero's number. */
export type TallyStep = "points" | "claims" | "place";

/** An org answers to its claims (a project's score has no claim step); a ranked record to its peers. */
export function tallySteps(tally: ScoreTally): TallyStep[] {
	const steps: TallyStep[] = ["points"];
	if (tally.kind === "org") steps.push("claims");
	if (tally.place && tally.rating !== null) steps.push("place");
	return steps;
}

/** The big figure once `step` is walked: an org's projects' mean or a project's score, the score after claims, the rating. */
export function stepFigure(tally: ScoreTally, step: TallyStep): number {
	const fallback = tally.score ?? sumsThrough(tally.tables, LAST).pct ?? 0;
	if (step === "points") return (tally.kind === "org" ? tally.org?.mean : tally.score) ?? fallback;
	if (step === "claims") return fallback;
	return tally.rating ?? fallback;
}

export type Beat = { to: number; ms: number; hold: number; peers: boolean };

/** One beat per step: count to its figure, hold so the step reads, then the next lights. The peers fill as the last counts. */
export function landingBeats(tally: ScoreTally): Beat[] {
	return tallySteps(tally).map((step) => ({
		to: stepFigure(tally, step),
		ms: step === "place" ? 1200 : 750,
		hold: step === "claims" ? 650 : 450,
		peers: step === "place",
	}));
}

const ratioText = (r: number) => (r >= 1 ? "1" : r.toFixed(2));

/** Step 2's words: a reviewed claim divides planted by claimed and leaves the score; without one, nothing comes off. */
export function claimLine(tally: ScoreTally): { words: string; factor: string; leaves: string | null } {
	const ratio = tally.org?.reviewed ? tally.org.ratio : null;
	if (ratio === null || ratio === undefined) return { words: m.ww_rating_tally_claim_none(), factor: "× 1", leaves: null };
	return {
		words: m.ww_rating_tally_claim_ratio(),
		factor: `× ${ratioText(ratio)}`,
		leaves: m.ww_rating_tally_claim_leaves({ score: (tally.score ?? 0).toFixed(1) }),
	};
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

/** Step 3's heading and its place line, or null when the record is not ranked. */
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

/** Which of the ascending peers is this record's: rank 1 is the top. Over 120 the peers are quantiles, so the rank is scaled onto them. */
export function ownBar(place: { rank: number; of: number; peers: number[] }): number {
	const n = place.peers.length;
	if (n <= 1) return 0;
	const fromBottom = (place.of - place.rank) / Math.max(1, place.of - 1);
	return Math.min(n - 1, Math.max(0, Math.round(fromBottom * (n - 1))));
}

/** How many bars below its own are lit at `k` of the walk: the lowest first, every one under it by the end. */
export function peersLit(own: number, k: number): number {
	return Math.min(own, Math.round(Math.min(1, Math.max(0, k)) * (own + 1)));
}

/** The peers as bars on a 240 × 34 strip, heights in proportion to their scores; a zero still shows a sliver. */
export function peerBars(peers: number[], width = 240, base = 32): { x: number; y: number; w: number; h: number }[] {
	const n = peers.length;
	if (!n) return [];
	const gap = n > 60 ? 0.6 : 1.4;
	const w = (width - gap * (n - 1)) / n;
	return peers.map((s, i) => {
		const h = Math.max(1, (base * Math.min(100, Math.max(0, s))) / 100);
		return { x: i * (w + gap), y: base - h, w, h };
	});
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
