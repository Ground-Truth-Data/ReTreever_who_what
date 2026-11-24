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

/**
 * Where the scroll line is through tab `index`'s stretch of the run, 0 to 1: the stretch is the half step either side
 * of its centre, the first and last tabs' clipped at the run's ends, so every tab's line starts at 0 and ends at 1.
 */
export function lineFor(progress: number, index: number, n: number): number {
	if (n <= 1) return Math.min(1, Math.max(0, progress));
	const lo = index === 0 ? 0 : index - 0.5;
	const hi = index === n - 1 ? n - 1 : index + 0.5;
	return Math.min(1, Math.max(0, (progress - lo) / (hi - lo))) || 0;
}

/** The row the scroll line is on: the first at 0, the last at 1, each holding an equal share between. */
export function rowAt(line: number, rows: number): number {
	if (rows <= 0) return -1;
	return Math.min(rows - 1, Math.max(0, Math.floor(line * rows)));
}
