<script lang="ts">
// The tree curtains over the whole viewport: shut by frame 7 of 14, when the
// page behind them swaps, open again by the last frame, which is empty. Mounted
// once by a layout above both pages, so it outlives the navigation it hides.
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrls, loadClips, type ClipFacts } from "$gc/frameClips";
import { CURTAIN_CLIP, curtain } from "./curtain.svelte";

let { clipRoot = undefined }: { clipRoot?: string } = $props();

let facts = $state<ClipFacts | null>(null);

// Loaded and preloaded on mount, so the first wipe runs at speed.
$effect(() => {
	if (!clipRoot) return;
	let live = true;
	loadClips(clipRoot).then((m) => {
		if (!live) return;
		facts = m.clips[CURTAIN_CLIP] ?? null;
		if (facts) {
			for (const u of frameUrls(clipRoot, CURTAIN_CLIP, facts)) {
				const img = new Image();
				img.src = u;
			}
		}
	});
	return () => {
		live = false;
	};
});

const mid = $derived(facts ? Math.ceil(facts.frameCount / 2) : 0);

// Two halves: the curtains close, hold shut on the midpoint frame until the
// new page is in, then open. A dev server's load takes longer than seven frames.
let phase = $state<"close" | "open">("close");
let wipeToken = $state(-1);
$effect(() => {
	if (curtain.token !== wipeToken) {
		wipeToken = curtain.token;
		phase = "close";
	}
});

// No clips to draw (standalone, or the manifest not here yet): the page still swaps.
$effect(() => {
	if (curtain.href && !(clipRoot && facts)) {
		void curtain.midpoint().then(() => curtain.done());
	}
});

async function shut() {
	await curtain.midpoint();
	phase = "open";
}
</script>

{#if curtain.href && clipRoot && facts}
	{#key `${curtain.token}:${phase}`}
		<div class="curtain-layer" aria-hidden="true">
			{#if phase === "close"}
				<FrameClipPlayer root={clipRoot} clip={CURTAIN_CLIP} {facts} to={mid} onDone={shut} />
			{:else}
				<FrameClipPlayer root={clipRoot} clip={CURTAIN_CLIP} {facts} from={mid} onDone={() => curtain.done()} />
			{/if}
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
