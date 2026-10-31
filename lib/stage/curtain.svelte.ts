// The tree curtains: one wipe at a time, owned by whichever layout mounts
// CurtainLayer, because the page under them changes while they are shut.

import { goto, preloadData } from "$app/navigation";

export const CURTAIN_CLIP = "tree-curtains";

let href = $state<string | null>(null);
let token = $state(0);
let wanted = $state(false);

export const curtain = {
	/** The destination of the wipe in flight, or null when the curtains are open. */
	get href() {
		return href;
	},
	/** Bumps on every wipe so a second wipe to the same place still replays. */
	get token() {
		return token;
	},
	/** A wipe is likely: the frames should load now, not on every page. */
	get wanted() {
		return wanted;
	},
	/** The reader is on a search page or in a search bar: a pick, and so a wipe, may follow. */
	warm() {
		wanted = true;
	},
	/**
	 * Shut the curtains, swap the page behind them, let them open on the new one.
	 * The destination's data loads while they close, so the swap at the midpoint
	 * is a render, not a round trip.
	 */
	wipe(to: string) {
		wanted = true;
		href = to;
		token += 1;
		void preloadData(to);
	},
	/** The curtains are shut: swap the page behind them. Resolves once the new page is in. */
	async midpoint() {
		if (href) await goto(href);
	},
	done() {
		href = null;
	},
};
