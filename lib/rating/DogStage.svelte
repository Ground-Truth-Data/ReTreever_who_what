<script lang="ts" module>
import { createContext } from "svelte";

/**
 * The dog's frames cut to its stage window, each with its own clips.json: sized
 * for a phone, and at the window's own 940px. `reach`: the walk on alone, cut
 * on past the window's right edge so it can start off the screen.
 */
export type StageClipRoots = { phone?: string; desktop?: string; reach?: string };

// The rating route lends the cut frames to the dog without the page between them carrying them.
export const [getStageClipRoots, setStageClipRoots, hasStageClipRoots] = createContext<StageClipRoots>();

// A server render carries the record in its HTML, so on the document's first page it landed with that.
let pageSeen = false;
</script>

<script lang="ts">
// The dog walks on and stands watching; once the number is up it turns in the
// score's state and settles. On the neutral face it then breathes, blinking
// between runs of breaths; any other face holds its last frame and blinks now
// and then. Clips come from the host's clipRoot; absent, the stage stays
// empty — the number never waits on a clip.
import { onDestroy, untrack } from "svelte";
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrl, loadClips, type ClipFacts, type ClipManifest } from "$gc/frameClips";
import {
	BLINK_FROM,
	BREATH,
	BREATH_BLINK,
	BREATH_BLINK_SHEET,
	breathPlays,
	entranceFor,
	idleBlinkFor,
	idleFor,
	reactionFor,
	standingFor,
	watchingFor,
	type DogStep,
} from "./dogReaction";
import { ratingState } from "./ratingState";
import hillWebp from "../assets/hill_pattern.webp";
import hillAvif from "../assets/hill_pattern.avif";
import hillPhone from "../assets/hill_pattern-1290.avif";
import tuft3 from "../assets/pub-Rtvr/home/tufts/tuft-3.webp";
import tuft7Flipped from "../assets/pub-Rtvr/home/tufts/tuft-7-flipped.webp";
import tuft9 from "../assets/pub-Rtvr/home/tufts/tuft-9.webp";

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
// The walk on and the watching hold after it play from here when the host lends it.
let reach = $state.raw<{ root: string; facts: ClipFacts } | null>(null);
let steps = $state.raw<DogStep[]>([]);
let at = $state(0);
let blink = $state<string | null>(null);
let standing = $state(false);
// The entrance ends with the sapling set down beside the dog; no other clip
// draws it, so its patch of the entrance's last frame stays on stage underneath.
let planted = $state(false);
// The last step has played out: coming back from a blink shows its final frame, not a replay.
let settled = $state(false);
// Settled on the neutral face: breathing in runs, a blink between them.
let idling = $state(false);
let breath: DogStep | null = null;
let reacted = false;
let toldStanding = false;
let blinkWanted = false;
// A held frame or a re-run can report done twice; a step moves the dog on once.
const finished = new WeakSet<DogStep>();
let blinkTimer: ReturnType<typeof setTimeout> | undefined;
let nudgeTimer: ReturnType<typeof setTimeout> | undefined;

// Below 768px the stage paints at most ~600 device px: the window alone, sized for it.
const PHONE = "(max-width: 767px)";
const cut = hasStageClipRoots() ? getStageClipRoots() : undefined;
let root = $state<string | undefined>(undefined);
const cropped = $derived(!!root && (root === cut?.phone || root === cut?.desktop));
const reduceMotion = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// The number waits for the dog at most this long after the record lands, so a
// slow phone sees the score while the dog is still on its way. Unthrottled
// desktop stands at ~3.7 s, inside it.
const NUMBER_BUDGET_MS = 4000;
const firstPage = typeof window !== "undefined" && !pageSeen;
if (typeof window !== "undefined") pageSeen = true;
let landedAt: number | null = null;
// The number's 600 ms lob leaves the mouth this many ticks before the walk ends, so it lands as the dog plants.
const LOB_LEAD_TICKS = 14;
// Frames decoded ahead of each step; the rest are only fetched, so a step's first ticks never wait on a decode.
const WARM_DECODED = 8;

const ENTRANCE = "dog-entrance";
const dogState = $derived(ratingState(rating));
const current = $derived<DogStep | undefined>(blink ? { clip: blink, loop: false } : steps[at]);
const held = $derived(!!current && (!!current.hold || (settled && !blink && !idling)));
const reaching = $derived(!!reach && current?.clip === ENTRANCE);
const heldFrame = $derived(current && manifest ? (current.frames?.at(-1) ?? manifest.clips[current.clip].frameCount) : 1);
const breathing = $derived(settled && !idling && dogState === "opaque");
const saplingSrc = $derived.by(() => {
	const facts = manifest?.clips[ENTRANCE];
	return root && facts ? frameUrl(root, ENTRANCE, facts, facts.frameCount) : null;
});

// Kept for the page's life: an Image dropped mid-fetch can be cancelled.
const warmed = new Map<string, { img: HTMLImageElement; decoded?: Promise<void> }>();
function warm(url: string, decode: boolean): Promise<void> {
	let w = warmed.get(url);
	if (!w) {
		const img = new Image();
		if (!decode) img.fetchPriority = "low";
		img.src = url;
		w = { img };
		warmed.set(url, w);
	}
	if (decode) w.decoded ??= w.img.decode().catch(() => {});
	return w.decoded ?? Promise.resolve();
}

function warmStep(from: string, clips: Record<string, ClipFacts>, step: DogStep | null | undefined, limit = Infinity): Promise<void>[] {
	const facts = step && clips[step.clip];
	if (!step || !facts) return [];
	const order = [...new Set(step.frames ?? Array.from({ length: facts.frameCount }, (_, k) => k + 1))].slice(0, limit);
	return order.map((f, n) => warm(frameUrl(from, step.clip, facts, f), n < WARM_DECODED || limit !== Infinity));
}

// The walk starts on a quiet page: its first frames decoded, two frames
// painted and the main thread idle, so start-up work never stutters its first steps.
function quietStart(from: string, clips: Record<string, ClipFacts>, entrance: DogStep): Promise<void> {
	const firsts = warmStep(from, clips, entrance, 10);
	const quiet = Promise.allSettled(firsts).then(
		() =>
			new Promise<void>((r) =>
				requestAnimationFrame(() =>
					requestAnimationFrame(() =>
						typeof requestIdleCallback === "function" ? requestIdleCallback(() => r(), { timeout: 300 }) : r(),
					),
				),
			),
	);
	return Promise.race([quiet, new Promise<void>((r) => setTimeout(r, 800))]);
}

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
	const from = (matchMedia(PHONE).matches && cut?.phone) || cut?.desktop || clipRoot;
	const wide = cut?.reach;
	root = from;
	let live = true;
	Promise.all([loadClips(from), wide ? loadClips(wide).catch(() => null) : null]).then(
		([m, r]) => {
			if (!live) return;
			manifest = m;
			const walk = r?.clips[ENTRANCE];
			reach = wide && walk && walk.frameCount === m.clips[ENTRANCE]?.frameCount ? { root: wide, facts: walk } : null;
			const entrance = entranceFor(m.clips);
			if (!entrance.length) {
				stand(standingFor(m.clips));
				return;
			}
			const sapling = m.clips[ENTRANCE];
			warm(frameUrl(from, ENTRANCE, sapling, sapling.frameCount), true);
			void quietStart(reach?.root ?? from, m.clips, entrance[0]).then(() => {
				if (live) steps = entrance;
			});
		},
		() => {
			if (live) stand([]);
		},
	);
	return () => {
		live = false;
	};
});

// The next step's first frames are decoded while this one plays; the reaction's
// during the walk on, and the settled dog's clips once it is turning.
$effect(() => {
	if (!manifest || !root) return;
	const clips = manifest.clips;
	const state = dogState;
	const from = root;
	const next = reacted ? steps[at + 1] : reactionFor(state, clips)[0];
	untrack(() => {
		warmStep(from, clips, next);
		if (!reacted) return;
		warmStep(from, clips, idleFor(reactionFor(state, clips), clips, 1));
		warmStep(from, clips, { clip: BREATH_BLINK, loop: false, frames: BREATH_BLINK_SHEET });
		const blinkClip = idleBlinkFor(state, clips);
		if (blinkClip) warmStep(from, clips, { clip: blinkClip, loop: false });
	});
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
	const reaction = reactionFor(dogState, manifest.clips);
	// With no turn to make, an unscored dog stops watching and faces the reader.
	const next = reaction.length ? reaction : steps[at]?.hold ? standingFor(manifest.clips) : null;
	if (!next) return;
	reacted = true;
	settled = false;
	idling = false;
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

function breathe() {
	if (!breath) return;
	steps = [{ ...breath, loop: breathPlays() }];
	at = 0;
}

function breathBlink() {
	steps = [{ clip: BREATH_BLINK, loop: false, frames: BREATH_BLINK_SHEET }];
	at = 0;
}

function settle() {
	settled = true;
	breath = !reduceMotion && manifest ? idleFor(steps, manifest.clips, 1) : null;
	if (breath) {
		idling = true;
		breathe();
		return;
	}
	scheduleBlink();
}

function stepDone() {
	const step = current;
	if (!step || finished.has(step)) return;
	finished.add(step);
	if (blink) {
		blink = null;
		scheduleBlink();
		return;
	}
	if (step.hold) return;
	if (idling) {
		if (step.clip === BREATH) breathBlink();
		else breathe();
		return;
	}
	if (at + 1 < steps.length) {
		at += 1;
		return;
	}
	if (!standing) {
		planted = step.clip === ENTRANCE;
		stand(watchingFor(manifest?.clips ?? {}));
		return;
	}
	settle();
}

function frameShown(frame: number) {
	const step = current;
	if (!step || !manifest) return;
	if (!standing && !toldStanding && step.clip === ENTRANCE && !step.hold) {
		const ticks = step.frames ?? Array.from({ length: manifest.clips[ENTRANCE].frameCount }, (_, k) => k + 1);
		if (frame >= ticks[Math.max(0, ticks.length - LOB_LEAD_TICKS)]) {
			toldStanding = true;
			onstanding?.();
		}
	}
	// The blink takes over once this frame has had its tick, so the breath frame it joins from stays on screen.
	if (blinkWanted && idling && step.clip === BREATH && BLINK_FROM.includes(frame)) {
		blinkWanted = false;
		clearTimeout(nudgeTimer);
		nudgeTimer = setTimeout(
			() => {
				if (idling && current?.clip === BREATH) breathBlink();
			},
			1000 / manifest.clips[BREATH].fps - 8,
		);
	}
}

/** One idle blink now — or, while breathing, at the next frame it joins from — when the dog stands settled. */
export function nudge(): void {
	if (!standing || !settled || blink || !manifest) return;
	if (idling) {
		blinkWanted = current?.clip === BREATH;
		return;
	}
	clearTimeout(blinkTimer);
	blink = idleBlinkFor(dogState, manifest.clips);
}

onDestroy(() => {
	clearTimeout(blinkTimer);
	clearTimeout(nudgeTimer);
});
</script>

<svelte:head>
	{#if clipRoot}
		<!-- The manifest leaves with the HTML, so the frames start the moment the script runs. -->
		{#if cut?.phone}
			<link rel="preload" href="{cut.phone}/clips.json" as="fetch" crossorigin="anonymous" media={PHONE} />
			<link rel="preload" href="{cut.desktop ?? clipRoot}/clips.json" as="fetch" crossorigin="anonymous" media="(min-width: 768px)" />
		{:else}
			<link rel="preload" href="{cut?.desktop ?? clipRoot}/clips.json" as="fetch" crossorigin="anonymous" />
		{/if}
		{#if cut?.reach}
			<link rel="preload" href="{cut.reach}/clips.json" as="fetch" crossorigin="anonymous" />
		{/if}
	{/if}
</svelte:head>

<div
	class="earth back"
	aria-hidden="true"
	style="--art-hill-webp: url({hillWebp}); --art-hill-avif: url({hillAvif}); --art-hill-phone: url({hillPhone});"
></div>
<div class="dog-stage" class:cropped class:breathing aria-hidden="true">
	{#if planted && saplingSrc}
		<img class="sapling" src={saplingSrc} alt="" draggable="false" />
	{/if}
	{#if manifest && root && current}
		<!-- One player for every clip, not one per clip: a fresh <img> paints blank until its frame
		     decodes, which flashed the dog out between clips. Swapping src keeps the last frame up. -->
		<FrameClipPlayer
			root={reaching && reach ? reach.root : root}
			clip={current.clip}
			facts={reaching && reach ? reach.facts : manifest.clips[current.clip]}
			loop={current.loop}
			frames={held ? undefined : current.frames}
			from={held ? heldFrame : 1}
			decodeFirst
			clock="elapsed"
			onDone={stepDone}
			onFrame={frameShown}
		/>
	{/if}
</div>
<div
	class="earth lip"
	aria-hidden="true"
	style="--art-hill-webp: url({hillWebp}); --art-hill-avif: url({hillAvif}); --art-hill-phone: url({hillPhone});"
></div>
{#if planted}
	<div class="sprouts" aria-hidden="true">
		<img class="sprout" style="--at: 62%; --h: 8%; --ratio: 320 / 226; --delay: 0ms" src={tuft7Flipped} alt="" draggable="false" />
		<img class="sprout" style="--at: 71%; --h: 14%; --ratio: 320 / 252; --delay: 90ms" src={tuft9} alt="" draggable="false" />
		<img class="sprout" style="--at: 79%; --h: 9%; --ratio: 320 / 216; --delay: 180ms" src={tuft3} alt="" draggable="false" />
	</div>
{/if}

<style>
	/* The dog uses a corner of its 2732x2048 frame: every settled clip sits in
	   x 979-1630, y 461-1291, and the entrance walks in from the right, from
	   x 2464. The stage shows that window (x 940-1880, y 420-1320), open on its
	   right for the walk on, so the dog reads at the comp's size instead of as
	   a speck. Clips share the frame, so one crop serves them all. */
	.dog-stage {
		--win-x: 940;
		--win-y: 420;
		--win-w: 940;
		--win-h: 900;
		position: relative;
		width: 100%;
		aspect-ratio: 940 / 900;
		/* Open on the right: the walk on starts off the screen, and the page clips it at the screen's edge. */
		clip-path: inset(0 -100vw 0 0);
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

	/* The cut frames start at the window's corner: import-rtvr-assets.py --stage-crops,
	   --window-crops and --reach-crops. Sized by height, the walk on's wider frames run
	   on past the stage's right edge with every other clip's geometry. */
	.dog-stage.cropped :global(.frame-clip) {
		width: auto !important;
		height: 100%;
		left: 0;
		top: 0;
	}

	.cropped .sapling {
		width: 100% !important;
		left: 0;
		top: 0;
	}

	/* From the paw line, so a breath never lifts the paws off the ground. */
	.dog-stage :global(.frame-clip) {
		transform-origin: 47.7% 61.6%;
	}

	.dog-stage.cropped :global(.frame-clip) {
		transform-origin: 38.7% 93.4%;
	}

	/* The sapling's box again, in the window's own coordinates. */
	.cropped .sapling {
		clip-path: inset(51.7% 28.7% 3.9% 57.9%);
	}

	/* Ground for the dog and the sapling where a valley of the crest would
	   leave them on the sky: the hills' own texture at the crest's scale,
	   running down past the stage into the soil fade. Positions are in the
	   window: paws end 93.4% down, the plug spans x 57.9-65.6%, y 79.8-95.3%.
	   Both layers share one box and one background, so the lip in front of
	   the plug's base is the same ground the dog sits on. */
	.earth {
		position: absolute;
		left: -10%;
		right: -10%;
		top: 86%;
		bottom: -25%;
		pointer-events: none;
		background-image: var(--art-hill-webp);
		background-image: image-set(var(--art-hill-avif) type("image/avif"), var(--art-hill-webp) type("image/webp"));
		background-size: 100vw auto;
		background-position: center 25%;
	}

	@media (max-width: 480px) {
		.earth {
			background-image: image-set(var(--art-hill-phone) type("image/avif"), var(--art-hill-webp) type("image/webp"));
		}
	}

	.earth.back {
		clip-path: ellipse(55% 92% at 50% 100%);
	}

	/* From 91% down: the plug's last tenth goes into the ground. */
	.earth.lip {
		clip-path: ellipse(4.6% 87% at 60% 100%);
	}

	/* Grass shoots out of the planting once the dog sits beside it. */
	.sprouts {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sprout {
		position: absolute;
		left: var(--at);
		top: 93.5%;
		height: var(--h);
		aspect-ratio: var(--ratio);
		translate: -50% -100%;
		transform-origin: 50% 100%;
	}

	@media (prefers-reduced-motion: no-preference) {
		.sprout {
			animation: shoot 520ms cubic-bezier(0.2, 0.9, 0.3, 1.25) var(--delay) both;
		}

		/* The sad dog has no breath drawn; a slow rise from the paw line stands in for one. */
		.dog-stage.breathing :global(.frame-clip) {
			animation: breathe 1.6s ease-in-out infinite alternate;
		}
	}

	@keyframes breathe {
		from {
			transform: scaleY(1);
		}
		to {
			transform: scaleY(1.012);
		}
	}

	@keyframes shoot {
		from {
			transform: scale(0.5, 0);
		}
		to {
			transform: none;
		}
	}
</style>
