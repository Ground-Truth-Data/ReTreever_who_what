// Lengths are % of the scale width, so the collage keeps its proportions and
// freezes past SCALE_MAX. A shard hangs off its own side.
//
// lane + reach set how far in from its side a shard's INNER edge comes:
//
//   screen edge                                             screen edge
//   |<-- gutter -->|<------ content (search bar) ------>|<-- gutter -->|
//   |<----------------------------- edge ------------------------------>|
//
//   gutter: reach 100 = the inner edge touches the content; 50 = halfway
//           out to the screen edge. Shrinks as the screen narrows, so on
//           a phone it is only MIN_GUTTER wide.
//   edge:   reach 100 = the inner edge is all the way across the screen.
//           Ignores the content; for shards above or below it.
//
//   A right shard with reach 30 shows its left 30% of the lane; the rest
//   hangs off the right side of the screen.

/** Lever: the gutter is never narrower than this % of the screen, so gutter
 *  shards still peek in on a phone. Raise it to pull them toward the centre. */
export const MIN_GUTTER = 15;

export type ShardSpec = {
	/** shardIndex.ts number — the page's `search_shard-<id>` */
	id: number;
	side: "left" | "right";
	/** which strip `reach` is measured in; see the diagram above */
	lane: "gutter" | "edge";
	/** % of the lane the inner edge reaches to; 100 = touching the content */
	reach: number;
	/** % of the section's height to the shard's top, or its middle with `from: "middle"` */
	y: number;
	/** "middle": pin the centre, so a hill shard sinks with the hill as a phone shrinks it, not floats above */
	from?: "middle";
	/** % of the scale width */
	w: number;
	/** the artwork's width ÷ height, measured from its SVG viewBox */
	aspect: number;
	/** degrees; keep within ~±14 or it reads as broken, not scattered */
	rot?: number;
	/** viewport px; narrower than this, the shard isn't drawn */
	hideBelow?: number;
};

export const SCALE_MIN = 360;
// 1440: the side columns must still stack inside a 767px hero on a short wide window.
export const SCALE_MAX = 1440;

export function scaleWidth(vw: number): number {
	return Math.max(SCALE_MIN, Math.min(SCALE_MAX, vw));
}

// Every /who shard, by number. A shard belongs to the section it is drawn in;
// shard 26 is the divider strip between the two, placed by the page.

/** Top section: sky, search bar, hill. */
export const HOME: ShardSpec[] = [
	{ id: 1,  side: "left",  lane: "edge",   reach: 40,  y: 4,   w: 55, aspect: 1.63924, rot: 0 },   // top-left, trees and snow
	{ id: 6,  side: "left",  lane: "edge",   reach: 47,  y: 74.9, from: "middle", w: 66, aspect: 1.90656, rot: 5 },   // left, green hillside
	// { id: 3,  side: "left",  lane: "edge",   reach: 88,  y: 45,  w: 33, aspect: 1.14372, rot: 216 }, // hidden
	{ id: 4,  side: "right", lane: "gutter", reach: 120, y: -3,  w: 66, aspect: 1.70643, rot: -10 }, // top-right, blue sky
	{ id: 7,  side: "right", lane: "gutter", reach: 128, y: 75.9, from: "middle", w: 45, aspect: 1.75093, rot: 4 },   // right, clear-cut
];

/** Lower section: dark hill, "ReTreever counts." */
export const HEADLINE: ShardSpec[] = [
	{ id: 2,  side: "right", lane: "gutter", reach: 120, y: 48,  w: 27, aspect: 0.67299, rot: 11 },  // right, tall aerial
	// { id: 5,  side: "right", lane: "gutter", reach: 104, y: 56,  w: 48, aspect: 2.43367, rot: 10 },  // hidden
	{ id: 12, side: "right", lane: "gutter", reach: 128, y: 6,   w: 45, aspect: 2.26411, rot: -9 },  // top-right, branches
	// { id: 13, side: "left",  lane: "gutter", reach: 110, y: 8,   w: 43, aspect: 2.02096, rot: 12 },  // hidden
	{ id: 15, side: "left", lane: "edge",   reach: 43,  y: 7,   w: 44, aspect: 1.1521,  rot: -5, hideBelow: 200 }, // the planters, behind the slogan
	// { id: 15, side: "right", lane: "edge",   reach: 99,  y: 9,   w: 44, aspect: 1.1521,  rot: -5, hideBelow: 200 }, // the planters, behind the slogan
	{ id: 14, side: "left",  lane: "gutter", reach: 170, y: 76,  w: 49, aspect: 2.45141, rot: 10 },  // lower-left, slash pile
];

export type Placed = {
	id: number;
	x: number;
	y: number;
	w: number;
	h: number;
	rot?: number;
};

export function place(
	specs: ShardSpec[], vw: number, sectionH: number, clearW: number, scaleMin = SCALE_MIN,
): Placed[] {
	const ref = Math.max(scaleMin, scaleWidth(vw));
	// From ref, not vw: past SCALE_MAX the whole collage freezes against the edges.
	const gutter = Math.max((MIN_GUTTER / 100) * ref, (ref - clearW) / 2);
	return specs.filter((s) => vw >= (s.hideBelow ?? 0)).map((s) => {
		const w = (s.w / 100) * ref;
		const h = w / s.aspect;
		const lane = s.lane === "gutter" ? gutter : ref;
		const inner = (s.reach / 100) * lane;
		return {
			id: s.id,
			x: s.side === "left" ? inner - w : vw - inner,
			y: (s.y / 100) * sectionH - (s.from === "middle" ? h / 2 : 0),
			w,
			h,
			rot: s.rot,
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

export type SectionInput = {
	height: number;
	/** width of the centered content the gutter lane keeps clear of */
	clearW: number;
	specs: ShardSpec[];
	/** narrower screens size and lane this section's shards as if this wide, so they stay big on a phone */
	scaleMin?: number;
};

export function layoutPage(
	vw: number, sections: SectionInput[],
): Placed[][] {
	return sections.map((s) => place(s.specs, vw, s.height, s.clearW, s.scaleMin));
}
