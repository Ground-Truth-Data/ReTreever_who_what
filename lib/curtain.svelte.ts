// The tree curtains: one wipe at a time, owned by whichever layout mounts
// CurtainLayer, because the page under them changes while they are shut.

import { goto, preloadData } from "$app/navigation";

export const CURTAIN_CLIP = "tree-curtains";

let href = $state<string | null>(null);
let token = $state(0);

export const curtain = {
	/** The destination of the wipe in flight, or null when the curtains are open. */
	get href() {
		return href;
	},
	/** Bumps on every wipe so a second wipe to the same place still replays. */
	get token() {
		return token;
	},
	/**
	 * Shut the curtains, swap the page behind them, let them open on the new one.
	 * The destination's data loads while they close, so the swap at the midpoint
	 * is a render, not a round trip.
	 */
	wipe(to: string) {
		href = to;
		token += 1;
		void preloadData(to);
	},
	/** Frame 7 of 14: the curtains are fully shut. Resolves once the new page is in. */
	async midpoint() {
		if (href) await goto(href);
	},
	done() {
		href = null;
	},
};
