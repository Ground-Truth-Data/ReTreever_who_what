// The designer's search_dropdown window drawn as a nine-slice frame: the four
// cuts sit just inside the black panel's edges, so the skewed corners keep
// their drawing while only the straight runs stretch to the list's height.

/** The window SVG's viewBox, in its own units. */
export const WINDOW_BOX = { w: 330.04336, h: 72.012885 };

/** Where each cut falls, in viewBox units from that edge. */
export const WINDOW_CUT = { top: 4.4, right: 14.6, bottom: 10.6, left: 19.6 };

/** `border-image-slice` offsets as percentages of the image's own size. */
export function windowSliceCss(): string {
	const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;
	return [
		pct(WINDOW_CUT.top, WINDOW_BOX.h),
		pct(WINDOW_CUT.right, WINDOW_BOX.w),
		pct(WINDOW_CUT.bottom, WINDOW_BOX.h),
		pct(WINDOW_CUT.left, WINDOW_BOX.w),
	].join(" ");
}

/** The matching border widths, each cut times one viewBox unit on screen. */
export function windowBorderCss(unit: string): string {
	return [WINDOW_CUT.top, WINDOW_CUT.right, WINDOW_CUT.bottom, WINDOW_CUT.left]
		.map((n) => `calc(${n} * ${unit})`)
		.join(" ");
}

/** The rectangle the list may paint in, in viewBox units. */
export function windowPanel() {
	return {
		x0: WINDOW_CUT.left,
		y0: WINDOW_CUT.top,
		x1: WINDOW_BOX.w - WINDOW_CUT.right,
		y1: WINDOW_BOX.h - WINDOW_CUT.bottom,
	};
}
