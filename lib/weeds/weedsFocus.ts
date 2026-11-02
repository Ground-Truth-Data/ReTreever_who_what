/**
 * Which row (or column) the reading cursor is on. The cursor walks the visible
 * span from its start to its end as the scroll goes from 0 to 1, so the first
 * item is lit at the top and the last at the bottom, never one stranded out of
 * reach. `starts` are the items' sorted leading edges, in content coordinates.
 */
export function focusIndex(starts: number[], viewStart: number, viewLen: number, progress: number): number {
	const cursor = viewStart + Math.min(Math.max(progress, 0), 1) * viewLen;
	let lo = 0;
	let hi = starts.length - 1;
	let found = 0;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (starts[mid] <= cursor) {
			found = mid;
			lo = mid + 1;
		} else hi = mid - 1;
	}
	return found;
}
