// Position is pure config: edit x/y/w and only that shard moves. x/y may run
// past 0..100 — deliberate bleed off the edge.

export type ShardSpec = {
	id: number;
	/** % of viewport width */
	x: number;
	/** % of the section's height */
	y: number;
	/** % of viewport width, clamped to minw..maxw px */
	w: number;
	maxw: number;
	minw: number;
	/** degrees; keep within ~±14 or it reads as broken, not scattered */
	rot?: number;
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

// The fixed navbar is not part of section geometry: a shard at y:2 sits behind it.
export const NAVBAR_H = 80;

export const HOME: ShardSpec[] = [
	{ id: 1, x: 74, y: 4, w: 44, maxw: 500, minw: 96, rot: 7 },
	{ id: 2, x: 20, y: -22, w: 33, maxw: 190, minw: 52, rot: 11 },
	{ id: 3, x: 86, y: -9, w: 82, maxw: 335, minw: 68, rot: 11 },
	{ id: 4, x: -5, y: 20, w: 36, maxw: 785, minw: 96, rot: -6 },
	{ id: 8, x: 82, y: 55, w: 26, maxw: 425, minw: 100, rot: -5 },
	{ id: 9, x: -6, y: 72, w: 31, maxw: 455, minw: 84, rot: 7 },
	{ id: 11, x: -8, y: 40, w: 27, maxw: 400, minw: 96, rot: 4 },
];

export const HEADLINE: ShardSpec[] = [
	{ id: 7, x: 80, y: 6, w: 30, maxw: 540, minw: 96, rot: -9 },
	{ id: 6, x: -9, y: 18, w: 28, maxw: 410, minw: 88, rot: 12 },
	{ id: 10, x: -8, y: 62, w: 26, maxw: 385, minw: 96, rot: -13 },
	{ id: 5, x: 84, y: 66, w: 24, maxw: 355, minw: 84, rot: 10 },
];

export type Placed = {
	id: number;
	x: number;
	y: number;
	w: number;
	h: number;
	rot?: number;
	art?: number;
};

/** A section's shards resolved to px. */
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

/** 0 (far)..1 (near), from width normalised to the widest shard present. */
export function depthOf(p: Placed, widest: number): number {
	if (widest <= 0) return 0;
	// ~narrowest/widest, so the narrowest present maps to 0 instead of ~0.38.
	const NARROWEST_RATIO = 0.35;
	const ratio = Math.min(1, p.w / widest);
	const t = (ratio - NARROWEST_RATIO) / (1 - NARROWEST_RATIO);
	return Math.max(0, Math.min(1, t));
}

export const MAX_PARALLAX_RATE = 0.12;

/** Negative: shards rise against the scroll. */
export function parallaxY(depth: number, scrolled: number): number {
	return -scrolled * MAX_PARALLAX_RATE * depth;
}

// Integers only: z-index rounds a fractional value into a hard cut. Negative
// because the grass sits at z 3 and must stay in front of every shard.
export function layerOf(depth: number): number {
	if (depth >= 0.66) return 0;
	if (depth >= 0.33) return -1;
	return -2;
}

export type SectionInput = {
	height: number;
	specs: ShardSpec[];
};

export function layoutPage(
	vw: number, sections: SectionInput[],
): Placed[][] {
	return sections.map((s) => place(s.specs, vw, s.height));
}
