/** The tab the page position lands on: one tab per step, index 0 above the track, the last tab past it. */
export function tabIndexFor(progress: number, step: number, n: number): number {
	if (n <= 1 || !(step > 0)) return 0;
	return Math.min(n - 1, Math.max(0, Math.round(progress / step)));
}

/** The page position at the centre of a tab's segment, where a click or a key lands. */
export function scrollTopFor(index: number, trackTop: number, step: number): number {
	return trackTop + index * step;
}
