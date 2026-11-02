<script lang="ts" module>
import { createContext } from "svelte";

// The rating route lends the phone's frames to the dog without the page between them carrying them.
export const [getStageClipRoot, setStageClipRoot, hasStageClipRoot] = createContext<string | undefined>();

// A server render carries the record in its HTML, so on the document's first page it landed with that.
let pageSeen = false;
</script>

<script lang="ts">
// The dog walks on and stands watching; once the number is up it turns in the
// score's state, settles, then blinks now and then. Clips come from the host's
// clipRoot; absent, the stage stays empty — the number never waits on a clip.
import { onDestroy } from "svelte";
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrl, loadClips, type ClipManifest } from "$gc/frameClips";
import { entranceFor, idleBlinkFor, reactionFor, standingFor, watchingFor, type DogStep } from "./dogReaction";
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
// The last step has played out: coming back from a blink shows its final frame, not a replay.
let settled = $state(false);
let reacted = false;
let blinkTimer: ReturnType<typeof setTimeout> | undefined;

// Below 768px the stage paints at most ~600 device px: the window alone, sized for it.
const PHONE = "(max-width: 767px)";
const stageClipRoot = hasStageClipRoot() ? getStageClipRoot() : undefined;
let root = $state<string | undefined>(undefined);
const cropped = $derived(!!root && root === stageClipRoot);

// The number waits for the dog at most this long after the record lands, so a
// slow phone sees the score while the dog is still on its way. Unthrottled
// desktop stands at ~3.7 s, inside it.
const NUMBER_BUDGET_MS = 4000;
const firstPage = typeof window !== "undefined" && !pageSeen;
if (typeof window !== "undefined") pageSeen = true;
let landedAt: number | null = null;

const dogState = $derived(ratingState(rating));
const current = $derived<DogStep | undefined>(blink ? { clip: blink, loop: false } : steps[at]);
const ENTRANCE = "dog-entrance";
const saplingSrc = $derived.by(() => {
	const facts = manifest?.clips[ENTRANCE];
	return root && facts ? frameUrl(root, ENTRANCE, facts, facts.frameCount) : null;
});

function stand(next: DogStep[]) {
	steps = next;
	at = 0;
	standing = true;
	onstanding?.();
}

$effect(() => {
	if (!clipRoot) {
		stand([]);
		return;
	}
	const from = stageClipRoot && matchMedia(PHONE).matches ? stageClipRoot : clipRoot;
	root = from;
	let live = true;
	loadClips(from).then(
		(m) => {
			if (!live) return;
			manifest = m;
			const entrance = entranceFor(m.clips);
			if (entrance.length) steps = entrance;
			else stand(standingFor(m.clips));
		},
		() => {
			if (live) stand([]);
		},
	);
	return () => {
		live = false;
	};
});

$effect(() => {
	if (rating === null || standing) return;
	if (landedAt === null) {
		const doc = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
		landedAt = firstPage && doc?.name === location.href ? doc.responseEnd : performance.now();
	}
	const wait = setTimeout(() => onstanding?.(), Math.max(0, landedAt + NUMBER_BUDGET_MS - performance.now()));
	return () => clearTimeout(wait);
});

$effect(() => {
	if (!armed || !standing || reacted || !manifest) return;
	const reaction = dogState === null ? [] : reactionFor(dogState, manifest.clips);
	// With no turn to make, an unscored dog stops watching and faces the reader.
	const next = reaction.length ? reaction : steps[at]?.hold ? standingFor(manifest.clips) : null;
	if (!next) return;
	reacted = true;
	settled = false;
	steps = next;
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
	if (steps[at]?.hold) return;
	if (at + 1 < steps.length) {
		at += 1;
		return;
	}
	if (!standing) {
		planted = steps[at]?.clip === ENTRANCE;
		stand(watchingFor(manifest?.clips ?? {}));
		return;
	}
	settled = true;
	scheduleBlink();
}

/** One idle blink now, when the dog stands settled and nothing is mid-play. */
export function nudge(): void {
	if (!standing || !settled || blink || !manifest) return;
	clearTimeout(blinkTimer);
	blink = idleBlinkFor(dogState, manifest.clips);
}

onDestroy(() => clearTimeout(blinkTimer));
</script>

<svelte:head>
	{#if clipRoot}
		<!-- The manifest leaves with the HTML, so the frames start the moment the script runs. -->
		{#if stageClipRoot}
			<link rel="preload" href="{stageClipRoot}/clips.json" as="fetch" crossorigin="anonymous" media={PHONE} />
			<link rel="preload" href="{clipRoot}/clips.json" as="fetch" crossorigin="anonymous" media="(min-width: 768px)" />
		{:else}
			<link rel="preload" href="{clipRoot}/clips.json" as="fetch" crossorigin="anonymous" />
		{/if}
	{/if}
</svelte:head>

<div class="dog-stage" class:cropped aria-hidden="true">
	{#if planted && saplingSrc}
		<img class="sapling" src={saplingSrc} alt="" draggable="false" />
	{/if}
	{#if manifest && root && current}
		<!-- One player for every clip, not one per clip: a fresh <img> paints blank until its frame
		     decodes, which flashed the dog out between clips. Swapping src keeps the last frame up. -->
		<FrameClipPlayer
			{root}
			clip={current.clip}
			facts={manifest.clips[current.clip]}
			loop={current.loop}
			from={current.hold || (settled && !blink) ? manifest.clips[current.clip].frameCount : 1}
			onDone={stepDone}
		/>
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

	/* The phone's frames are that window already, cut by import-rtvr-assets.py --stage-crops. */
	.dog-stage.cropped :global(.frame-clip),
	.cropped .sapling {
		width: 100% !important;
		left: 0;
		top: 0;
	}

	/* The sapling's box again, in the window's own coordinates. */
	.cropped .sapling {
		clip-path: inset(51.7% 28.7% 3.9% 57.9%);
	}
</style>
