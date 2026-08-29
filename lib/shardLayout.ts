// Position is purely config-driven — nothing computes/corrects/negotiates it; edit x/y/w and only that shard moves.
// x/y can be negative or >100 — intentional bleed off the edge, not a bug.

export type ShardSpec = {
	id: number;
	/** x of the shard's LEFT edge, as a % of viewport width. May be < 0 or > 100. */
	x: number;
	/** y of the shard's TOP edge, as a % of the section's height. May be < 0 or > 100. */
	y: number;
	/** width as a % of viewport width, then clamped by min/max px */
	w: number;
	maxw: number;
	minw: number;
	/** Rotation in degrees; keep modest (~±14) — beyond that reads as broken, not scattered. */
	rot?: number;
	/** artwork id for aspect lookup; defaults to `id` (see Placed.art) */
	art?: number;
};

// Each artwork's aspect ratio (w/h), read off its SVG viewBox.
const ASPECT: Record<number, number> = {
	1: 1.63924,
	2: 0.67299,
	3: 1.14372,
	4: 1.70643,
	5: 2.43367,
	6: 2.02096,
	7: 2.26411,
	8: 1.1521,
	9: 1.90656,
	10: 2.45141,
	11: 1.75093,
};

// ⚠️ fixed navbar isn't part of section layout geometry — a shard at y:2 (in a 700px section) sits behind it, not near the top.
export const NAVBAR_H = 80;

// The hero ring — shards around the search card.
export const HOME: ShardSpec[] = [
	// top-left: long reach inward, the biggest shard on the page
	{ id: 1, x: -16, y: 4, w: 44, maxw: 500, minw: 96, rot: -7 },
	// small punctuation below it, tucked against the left edge
	{ id: 2, x: 20, y: -22, w: 33, maxw: 190, minw: 52, rot: 11 },
	// top-right punctuation, outboard of the search card
	{ id: 3, x: 86, y: -9, w: 82, maxw: 335, minw: 68, rot: 11 },
	// upper-right: medium, beside the search bar but never touching it
	{ id: 4, x: 81, y: 30, w: 26, maxw: 385, minw: 96, rot: 6 },
	// mid-right: another long reach
	{ id: 5, x: 82, y: 55, w: 26, maxw: 425, minw: 100, rot: -5 },
	// bottom-left: long reach across the foot
	{ id: 9, x: -6, y: 72, w: 31, maxw: 455, minw: 84, rot: 7 },
	// mid-left: medium, fills the gap between shard 1 and the foot
	{ id: 11, x: -8, y: 40, w: 27, maxw: 400, minw: 96, rot: 4 },
];

// The headline ring — around "Find Truth in Reforestation."
export const HEADLINE: ShardSpec[] = [
	{ id: 7, x: 80, y: 6, w: 30, maxw: 440, minw: 96, rot: -9 },
	{ id: 6, x: -9, y: 18, w: 28, maxw: 410, minw: 88, rot: 12 },
	{ id: 10, x: -8, y: 62, w: 26, maxw: 385, minw: 96, rot: -13 },
	{ id: 8, x: 84, y: 66, w: 24, maxw: 355, minw: 84, rot: 10 },
];

// A shard resolved to px for a given viewport.
export type Placed = {
	id: number;
	x: number;
	y: number;
	w: number;
	h: number;
	rot?: number;
	/** Which artwork this draws; usually same as `id`, but a whole-page solve renumbers ids so this keeps the original artwork lookup. */
	art?: number;
};

// Resolve a section's shards to px — pure, no passes/iteration, no shard aware of another.
export function place(
	specs: ShardSpec[], vw: number, sectionH: number,
): Placed[] {
	return specs.map((s) => {
		const w = Math.max(s.minw, Math.min(s.maxw, (s.w / 100) * vw));
		const h = w / ASPECT[s.art ?? s.id];
		return {
			id: s.id,
			x: (s.x / 100) * vw,
			y: (s.y / 100) * sectionH,
			w,
			h,
			rot: s.rot,
			art: s.art,
		};
	});
}

// Depth: how near a shard reads, 0 (far)..1 (near); derived from width, normalized to the widest shard present.
export function depthOf(p: Placed, widest: number): number {
	if (widest <= 0) return 0;
	// rescale so the ~0.35 floor ratio of the narrowest present maps to 0 and the widest to 1
	const NARROWEST_RATIO = 0.35;
	const ratio = Math.min(1, p.w / widest);
	const t = (ratio - NARROWEST_RATIO) / (1 - NARROWEST_RATIO);
	return Math.max(0, Math.min(1, t));
}

// Vertical parallax offset (px) for a shard at `depth`, `scrolled` px down; negative = shard rises relative to the page (scrolls slower than the background).
export const MAX_PARALLAX_RATE = 0.12;

export function parallaxY(depth: number, scrolled: number): number {
	return -scrolled * MAX_PARALLAX_RATE * depth;
}

// Paint band for a depth: 0 (nearest)..-2 (furthest); feeds z-index: calc(2 + var(--layer)).
// ⚠️ must return an integer — z-index rounds a continuous value, silently breaking paint order.
// negative because z-index 2 is a ceiling, not a midpoint — the grass sits at 3 and must stay in front of every shard.
export function layerOf(depth: number): number {
	if (depth >= 0.66) return 0;
	if (depth >= 0.33) return -1;
	return -2;
}

/** One section's inputs. */
export type SectionInput = {
	height: number;
	specs: ShardSpec[];
};

// Resolve every section independently — no shared coordinate space, no cross-section collision.
export function layoutPage(
	vw: number, sections: SectionInput[],
): Placed[][] {
	return sections.map((s) => place(s.specs, vw, s.height));
}
