<script lang="ts">
// The dog reacts to the score: walks on, turns in the score's state, settles,
// then blinks now and then. Clips come from the host's clipRoot; absent, the
// stage stays empty.
import { onDestroy } from "svelte";
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { loadClips, type ClipManifest } from "$gc/frameClips";
import { idleBlinkFor, sequenceFor, stateFor, type DogStep } from "./dogReaction";

let {
	rating,
	clipRoot = undefined,
}: {
	rating: number | null;
	clipRoot?: string;
} = $props();

let manifest = $state<ClipManifest | null>(null);
let steps = $state<DogStep[]>([]);
let at = $state(0);
let blink = $state<string | null>(null);
let blinkTimer: ReturnType<typeof setTimeout> | undefined;

const dogState = $derived(manifest ? stateFor(rating, manifest.states) : null);
const current = $derived(blink ? { clip: blink, loop: false } : steps[at]);

$effect(() => {
	if (!clipRoot) return;
	let live = true;
	loadClips(clipRoot).then((m) => {
		if (live) manifest = m;
	});
	return () => {
		live = false;
	};
});

$effect(() => {
	if (!manifest) return;
	steps = sequenceFor(dogState, manifest.clips);
	at = 0;
	blink = null;
});

// Blinks are random within a band so two dogs on two tabs never blink in step.
function scheduleBlink() {
	clearTimeout(blinkTimer);
	if (!manifest || !idleBlinkFor(dogState, manifest.clips)) return;
	blinkTimer = setTimeout(() => {
		blink = idleBlinkFor(dogState, manifest!.clips);
	}, 2500 + Math.random() * 3500);
}

function stepDone() {
	if (blink) {
		blink = null;
		scheduleBlink();
		return;
	}
	if (at + 1 < steps.length) {
		at += 1;
		return;
	}
	scheduleBlink();
}

onDestroy(() => clearTimeout(blinkTimer));
</script>

<div class="dog-stage" aria-hidden="true">
	{#if manifest && clipRoot && current}
		{#key `${current.clip}:${at}:${blink}`}
			<FrameClipPlayer
				root={clipRoot}
				clip={current.clip}
				facts={manifest.clips[current.clip]}
				loop={current.loop}
				onDone={stepDone}
			/>
		{/key}
	{/if}
</div>

<style>
	/* The dog uses a corner of its 2732x2048 frame: every settled clip sits in
	   x 979-1630, y 461-1291, and the entrance walks in from the right as far as
	   x 1833. The stage shows that window (x 940-1880, y 420-1320) and nothing
	   else, so the dog reads at the comp's size instead of as a speck. Clips
	   share the frame, so one crop serves them all. */
	.dog-stage {
		--win-x: 940;
		--win-y: 420;
		--win-w: 940;
		--win-h: 900;
		position: relative;
		width: min(30rem, 80vw);
		aspect-ratio: 940 / 900;
		overflow: hidden;
		pointer-events: none;
	}

	.dog-stage :global(.frame-clip) {
		position: absolute;
		width: calc(100% * 2732 / var(--win-w)) !important;
		max-width: none;
		left: calc(-100% * var(--win-x) / var(--win-w));
		top: calc(-100% * var(--win-y) / var(--win-h));
	}
</style>
