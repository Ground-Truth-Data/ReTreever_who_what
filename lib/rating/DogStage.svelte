<script lang="ts">
// The dog walks on and stands watching; once the number is up it turns in the
// score's state, settles, then blinks now and then. Clips come from the host's
// clipRoot; absent, the stage stays empty — the number never waits on a clip.
import { onDestroy } from "svelte";
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrl, loadClips, type ClipManifest } from "$gc/frameClips";
import { entranceFor, idleBlinkFor, reactionFor, standingFor, type DogStep } from "./dogReaction";
import { ratingState } from "./ratingState";

let {
	rating,
	armed,
	clipRoot = undefined,
	onstanding = undefined,
}: {
	rating: number | null;
	/** The number is up: react now. */
	armed: boolean;
	clipRoot?: string;
	/** The dog is on stage and watching — or there is no dog to wait for. */
	onstanding?: () => void;
} = $props();

let manifest = $state<ClipManifest | null>(null);
let steps = $state<DogStep[]>([]);
let at = $state(0);
let blink = $state<string | null>(null);
let standing = $state(false);
// The entrance ends with the sapling set down beside the dog; no other clip
// draws it, so its patch of the entrance's last frame stays on stage underneath.
let planted = $state(false);
// The last step has played out: a remount after a blink shows its final frame, not a replay.
let settled = $state(false);
let reacted = false;
let blinkTimer: ReturnType<typeof setTimeout> | undefined;

const dogState = $derived(ratingState(rating));
const current = $derived(blink ? { clip: blink, loop: false } : steps[at]);
const ENTRANCE = "dog-entrance";
const saplingSrc = $derived.by(() => {
	const facts = manifest?.clips[ENTRANCE];
	return clipRoot && facts ? frameUrl(clipRoot, ENTRANCE, facts, facts.frameCount) : null;
});

function stand(clips: Record<string, unknown> = {}) {
	steps = standingFor(clips);
	at = 0;
	standing = true;
	onstanding?.();
}

$effect(() => {
	if (!clipRoot) {
		stand();
		return;
	}
	let live = true;
	loadClips(clipRoot).then(
		(m) => {
			if (!live) return;
			manifest = m;
			const entrance = entranceFor(m.clips);
			if (entrance.length) steps = entrance;
			else stand(m.clips);
		},
		() => {
			if (live) stand();
		},
	);
	return () => {
		live = false;
	};
});

$effect(() => {
	if (!armed || !standing || reacted || !manifest || dogState === null) return;
	const reaction = reactionFor(dogState, manifest.clips);
	if (!reaction.length) return;
	reacted = true;
	settled = false;
	steps = reaction;
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
	if (!standing) {
		planted = steps[at]?.clip === ENTRANCE;
		stand(manifest?.clips);
		return;
	}
	settled = true;
	scheduleBlink();
}

onDestroy(() => clearTimeout(blinkTimer));
</script>

<div class="dog-stage" aria-hidden="true">
	{#if planted && saplingSrc}
		<img class="sapling" src={saplingSrc} alt="" draggable="false" />
	{/if}
	{#if manifest && clipRoot && current}
		{#key `${current.clip}:${at}:${blink}`}
			<FrameClipPlayer
				root={clipRoot}
				clip={current.clip}
				facts={manifest.clips[current.clip]}
				loop={current.loop}
				from={settled && !blink ? manifest.clips[current.clip].frameCount : 1}
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
		width: 100%;
		aspect-ratio: 940 / 900;
		overflow: hidden;
		pointer-events: none;
	}

	/* The sapling's box in the shared frame: x 1484-1610, y 885-1285 of 2732x2048.
	   It sits under the player, so a paw that reaches it draws over it. */
	.sapling {
		clip-path: inset(43.2% 41.1% 37.3% 54.3%);
	}

	.dog-stage :global(.frame-clip),
	.sapling {
		position: absolute;
		width: calc(100% * 2732 / var(--win-w)) !important;
		max-width: none;
		left: calc(-100% * var(--win-x) / var(--win-w));
		top: calc(-100% * var(--win-y) / var(--win-h));
	}
</style>
