// Lengths are % of the scale width, so the collage keeps its proportions and
// freezes past SCALE_MAX. A shard hangs off its own side, and the gutter lane
// closes with the card, so a side shard slides off a phone, not behind the bar.

export type ShardSpec = {
	id: number;
	side: "left" | "right";
	/**
	 * Which strip the shard's inner edge is measured in:
	 * gutter — between the viewport edge and the centered content; vanishes on a phone.
	 * edge — the viewport, for shards above or below the content.
	 */
	lane: "gutter" | "edge";
	/** % of the lane the inner edge reaches to; 100 = touching the content */
	reach: number;
	/** % of the section's height */
	y: number;
	/** % of the scale width */
	w: number;
	/** the artwork's width ÷ height, measured from its SVG viewBox */
	aspect: number;
	/** degrees; keep within ~±14 or it reads as broken, not scattered */
	rot?: number;
	art?: number;
};

export const SCALE_MIN = 360;
// 1440: the side columns must still stack inside a 767px hero on a short wide window.
export const SCALE_MAX = 1440;

export function scaleWidth(vw: number): number {
	return Math.max(SCALE_MIN, Math.min(SCALE_MAX, vw));
}

export const HOME: ShardSpec[] = [
	{ id: 3, side: "left", lane: "edge", reach: 8, y: 2, w: 12, aspect: 1.14372, rot: 8 },
	{ id: 4, side: "left", lane: "gutter", reach: 66, y: 26, w: 24, aspect: 1.70643, rot: -6 },
	{ id: 11, side: "left", lane: "gutter", reach: 48, y: 57, w: 15, aspect: 1.75093, rot: 4 },
	{ id: 9, side: "left", lane: "edge", reach: 17, y: 78, w: 20, aspect: 1.90656, rot: 7 },
	{ id: 1, side: "right", lane: "edge", reach: 14, y: 4, w: 24, aspect: 1.63924, rot: 7 },
	{ id: 2, side: "right", lane: "gutter", reach: 20, y: 38, w: 7, aspect: 0.67299, rot: 11 },
	{ id: 8, side: "right", lane: "edge", reach: 16, y: 64, w: 19, aspect: 1.1521, rot: -5 },
];

// The rating page, from the designer's desktop plan: pine-pattern polygons
// hung off both edges, one strip across the top above the bar. Edge lane
// throughout — the plan places them from the viewport, behind the content.
export const RATING: ShardSpec[] = [
	{ id: 1, side: "left", lane: "edge", reach: 12, y: 3, w: 16, aspect: 1.6727, rot: -8 },
	{ id: 10, side: "left", lane: "edge", reach: 17, y: 23, w: 24, aspect: 2.4464, rot: 5 },
	{ id: 9, side: "left", lane: "edge", reach: 16, y: 42, w: 22, aspect: 1.3095, rot: -4 },
	{ id: 8, side: "left", lane: "edge", reach: 28, y: 74, w: 28, aspect: 2.1658, rot: 6 },
	{ id: 2, side: "left", lane: "edge", reach: 68, y: -1.5, w: 30, aspect: 3.4386, rot: -3 },
	{ id: 3, side: "right", lane: "edge", reach: 22, y: -2, w: 8, aspect: 0.7545, rot: 10 },
	{ id: 4, side: "right", lane: "edge", reach: 8, y: 2, w: 20, aspect: 1.2805, rot: 0 },
	{ id: 5, side: "right", lane: "edge", reach: 8, y: 30, w: 15, aspect: 1.5912, rot: 0 },
	{ id: 6, side: "right", lane: "edge", reach: 7, y: 48, w: 17, aspect: 1.5125, rot: 0 },
	{ id: 7, side: "right", lane: "edge", reach: 13, y: 69, w: 20, aspect: 1.5323, rot: 0 },
];

export const HEADLINE: ShardSpec[] = [
	{ id: 7, side: "right", lane: "gutter", reach: 58, y: 6, w: 25, aspect: 2.26411, rot: -9 },
	{ id: 6, side: "left", lane: "gutter", reach: 60, y: 18, w: 23, aspect: 2.02096, rot: 12 },
	{ id: 10, side: "left", lane: "gutter", reach: 50, y: 64, w: 19, aspect: 2.45141, rot: -13 },
	{ id: 5, side: "right", lane: "gutter", reach: 44, y: 66, w: 18, aspect: 2.43367, rot: 10 },
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

export function place(
	specs: ShardSpec[], vw: number, sectionH: number, clearW: number,
): Placed[] {
	const ref = scaleWidth(vw);
	// From ref, not vw: past SCALE_MAX the whole collage freezes against the edges.
	const gutter = Math.max(0, (ref - clearW) / 2);
	return specs.map((s) => {
		const w = (s.w / 100) * ref;
		const h = w / s.aspect;
		const lane = s.lane === "gutter" ? gutter : ref;
		const inner = (s.reach / 100) * lane;
		return {
			id: s.id,
			x: s.side === "left" ? inner - w : vw - inner,
			y: (s.y / 100) * sectionH,
			w,
			h,
			rot: s.rot,
			art: s.art,
		};
	});
}

/** Axis-aligned box of the shard once rotated about its centre. */
export function bounds(p: Placed): { left: number; right: number; top: number; bottom: number } {
	const r = ((p.rot ?? 0) * Math.PI) / 180;
	const halfW = (p.w * Math.abs(Math.cos(r)) + p.h * Math.abs(Math.sin(r))) / 2;
	const halfH = (p.w * Math.abs(Math.sin(r)) + p.h * Math.abs(Math.cos(r))) / 2;
	const cx = p.x + p.w / 2;
	const cy = p.y + p.h / 2;
	return { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH };
}

export function depthOf(p: Placed, widest: number): number {
	if (widest <= 0) return 0;
	// ~narrowest/widest, so the narrowest present maps to 0 instead of ~0.38.
	const NARROWEST_RATIO = 0.35;
	const ratio = Math.min(1, p.w / widest);
	const t = (ratio - NARROWEST_RATIO) / (1 - NARROWEST_RATIO);
	return Math.max(0, Math.min(1, t));
}

export const MAX_PARALLAX_RATE = 0.12;

export function parallaxY(depth: number, scrolled: number): number {
	return -scrolled * MAX_PARALLAX_RATE * depth;
}

// Negative: the grass sits at z 3 and must stay in front of every shard.
export function layerOf(depth: number): number {
	if (depth >= 0.66) return 0;
	if (depth >= 0.33) return -1;
	return -2;
}

export type SectionInput = {
	height: number;
	/** width of the centered content the gutter lane keeps clear of */
	clearW: number;
	specs: ShardSpec[];
};

export function layoutPage(
	vw: number, sections: SectionInput[],
): Placed[][] {
	return sections.map((s) => place(s.specs, vw, s.height, s.clearW));
}
