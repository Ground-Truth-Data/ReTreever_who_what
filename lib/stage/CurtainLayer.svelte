<script lang="ts">
// The tree curtains over the whole viewport: one clip per wipe, shut at its
// midpoint, when the page behind them swaps, open again by the last frame,
// which is empty. Mounted once by a layout above both pages, so it outlives
// the navigation it hides.
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrls, loadClips, type ClipFacts } from "$gc/frameClips";
import { CURTAIN_CLIP, curtain } from "./curtain.svelte";

let { clipRoot = undefined }: { clipRoot?: string } = $props();

let facts = $state<ClipFacts | null>(null);
let ready = $state(false);
// A wipe asked before its frames are in waits this long for them, then plays anyway.
const READY_CAP_MS = 1500;
let waited = $state(false);

// The manifest on mount; the frames only once a wipe is likely (curtain.warm),
// so a page with no search on it never fetches them.
$effect(() => {
	if (!clipRoot) return;
	let live = true;
	loadClips(clipRoot).then((m) => {
		if (live) facts = m.clips[CURTAIN_CLIP] ?? null;
	});
	return () => {
		live = false;
	};
});

// Held, so the decoded frames stay in memory for the wipe instead of revalidating mid-play.
let held: HTMLImageElement[] = [];
$effect(() => {
	if (!clipRoot || !facts || !curtain.wanted || held.length) return;
	const urls = frameUrls(clipRoot, CURTAIN_CLIP, facts);
	let left = urls.length;
	for (const u of urls) {
		const img = new Image();
		held.push(img);
		img.fetchPriority = "low";
		img.onload = img.onerror = () => {
			left -= 1;
			if (left === 0) ready = true;
		};
		img.src = u;
	}
});

$effect(() => {
	if (!curtain.href || ready) return;
	waited = false;
	const cap = setTimeout(() => (waited = true), READY_CAP_MS);
	return () => clearTimeout(cap);
});

const mid = $derived(facts ? Math.ceil(facts.frameCount / 2) : 0);

// The swap is fired, never awaited: the record streams, so the new page is one
// round trip away and lands under the shut frames. The clip never holds.
let swappedToken = -1;
function atFrame(frame: number) {
	if (frame < mid || swappedToken === curtain.token) return;
	swappedToken = curtain.token;
	void curtain.midpoint();
}

// No clips to draw (standalone, or the manifest not here yet): the page still swaps.
$effect(() => {
	if (curtain.href && !(clipRoot && facts)) {
		void curtain.midpoint().then(() => curtain.done());
	}
});
</script>

{#if curtain.href && clipRoot && facts && (ready || waited)}
	{#key curtain.token}
		<div class="curtain-layer" aria-hidden="true">
			<FrameClipPlayer root={clipRoot} clip={CURTAIN_CLIP} {facts} onFrame={atFrame} onDone={() => curtain.done()} />
		</div>
	{/key}
{/if}

<style>
	.curtain-layer {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		overflow: hidden;
		pointer-events: none;
	}

	/* Full-bleed: the clip's own width is the registry's 72rem; here it must
	   cover the viewport whatever its shape, so it is sized by the larger side. */
	.curtain-layer :global(.frame-clip) {
		width: max(100vw, calc(100vh * 2732 / 2048)) !important;
		max-width: none;
	}
</style>
