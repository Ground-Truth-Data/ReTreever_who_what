/** The tab the page position lands on: one tab per step, index 0 above the track, the last tab past it. */
export function tabIndexFor(progress: number, step: number, n: number): number {
	if (n <= 1 || !(step > 0)) return 0;
	return Math.min(n - 1, Math.max(0, Math.round(progress / step)));
}

/** The page position at the centre of a tab's segment, where a click or a key lands. */
export function scrollTopFor(index: number, trackTop: number, step: number): number {
	return trackTop + index * step;
}

/** How far along the run the page is, in tabs: 0 at the first, n - 1 at the last, and every fraction between. */
export function progressFor(offset: number, step: number, n: number): number {
	if (n <= 1 || !(step > 0)) return 0;
	return Math.min(n - 1, Math.max(0, offset / step)) || 0;
}

/** Where the dig line's head sits: between the centres of the tabs either side of the progress, by its fraction. */
export function headX(progress: number, centres: readonly number[]): number {
	if (centres.length === 0) return 0;
	if (centres.length === 1) return centres[0];
	const i = Math.min(centres.length - 2, Math.max(0, Math.floor(progress)));
	const f = Math.min(1, Math.max(0, progress - i));
	return centres[i] + (centres[i + 1] - centres[i]) * f;
}

/** Which of the cue's three wordings the lit tab takes. */
export function cueFor(index: number, n: number): "first" | "next" | "last" {
	if (index >= n - 1) return "last";
	return index <= 0 ? "first" : "next";
}
