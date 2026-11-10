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
import groundWebp from "../assets/pub-Rtvr/rating/ground.webp";
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
// The entrance sets the sapling down beside the dog; no other clip draws it,
// so from PLANT_FRAME its patch of the entrance's last frame stays on stage,
// over the dog, and sinks into the ground.
let planted = $state(false);
// The shoots are up: the number may come.
let grown = false;
// Moving, so it draws over the hero's words.
let running = $state(false);
let puffs = $state<Puff[]>([]);
let puffId = 0;
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
let growTimer: ReturnType<typeof setTimeout> | undefined;
let thudTimer: ReturnType<typeof setTimeout> | undefined;

// Below 768px the stage paints at most ~600 device px: the window alone, sized for it.
const PHONE = "(max-width: 767px)";
const cut = hasStageClipRoots() ? getStageClipRoots() : undefined;
let root = $state<string | undefined>(undefined);
const cropped = $derived(!!root && (root === cut?.phone || root === cut?.desktop));
const reduceMotion = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// The number waits for the dog at most this long after the record lands, so a
// slow phone sees the score while the dog is still on its way. Unthrottled
// desktop stands ~2.9 s after landing; the plant and the shoots put that
// 0.6 s past where the number used to leave, and the budget moved with it.
const NUMBER_BUDGET_MS = 4600;
const firstPage = typeof window !== "undefined" && !pageSeen;
if (typeof window !== "undefined") pageSeen = true;
let landedAt: number | null = null;
// Frames decoded ahead of each step; the rest are only fetched, so a step's first ticks never wait on a decode.
const WARM_DECODED = 8;

const ENTRANCE = "dog-entrance";
// The run ends on the frame the skid stops; the sapling is clear of the dog's nose from PLANT_FRAME on.
const STOP_FRAME = 19;
const PLANT_FRAME = 31;
// Run, plant, shoots, then the number: the shoots come up once the tree is in,
// and the dog stands to watch once they are. CSS reads these through --sink etc.
const SINK_MS = 300;
const SHOOT_MS = 420;
const SHOOT_STAGGER_MS = 70;
const GROW_MS = SINK_MS + 2 * SHOOT_STAGGER_MS + SHOOT_MS;

type Puff = { id: number; x: number; y: number; size: number; drift: number };
// Dust kicked up as the dog runs and skids, by entrance frame: where it leaves
// the ground in window px (the trailing paws while running, both ends of the
// skid), its size, and which way it drifts.
const DUST: Record<number, [x: number, y: number, size: number, drift: number][]> = {
	4: [[1150, 876, 1, 1]],
	5: [[1100, 878, 0.8, 1]],
	6: [[1040, 877, 1, 1]],
	7: [[960, 873, 0.8, 1]],
	8: [[820, 867, 1, 1]],
	9: [[780, 861, 0.8, 1]],
	10: [[760, 859, 1, 1]],
	11: [[720, 865, 0.8, 1]],
	12: [[670, 855, 1.1, 1]],
	13: [[300, 849, 1, -1], [600, 849, 1, 1]],
	15: [[250, 839, 1.3, -1], [560, 839, 1.2, 1]],
	16: [[230, 838, 1, -1]],
	17: [[240, 839, 1.1, -1], [580, 839, 1, 1]],
};
// The tree hits the ground at its trunk, window x 590 on the stage's foot.
const THUD: [x: number, y: number, size: number, drift: number][] = [[555, 900, 0.55, -1], [625, 900, 0.55, 1]];
const dogState = $derived(ratingState(rating));
const current = $derived<DogStep | undefined>(blink ? { clip: blink, loop: false } : steps[at]);
const held = $derived(!!current && (!!current.hold || (settled && !blink && !idling)));
const reaching = $derived(!!reach && current?.clip === ENTRANCE);
const heldFrame = $derived(current && manifest ? (current.frames?.at(-1) ?? manifest.clips[current.clip].frameCount) : 1);
const breathing = $derived(settled && !idling && dogState === "opaque");
// Every entrance frame from PLANT_FRAME on, and the watching hold, still draws
// the sapling where it was set down: cut out, so the sunk tree is the only one.
const treeCut = $derived(planted && current?.clip === ENTRANCE);
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
	tellStanding();
}

function tellStanding() {
	if (toldStanding || !standing || (planted && !grown)) return;
	toldStanding = true;
	onstanding?.();
}

function kick(dust: [number, number, number, number][]) {
	if (reduceMotion) return;
	puffs = [...puffs, ...dust.map(([x, y, size, drift]) => ({ id: ++puffId, x, y, size, drift }))];
}

function settleDust(id: number) {
	puffs = puffs.filter((p) => p.id !== id);
}

function plant() {
	planted = true;
	running = false;
	thudTimer = setTimeout(() => kick(THUD), reduceMotion ? 0 : SINK_MS);
	growTimer = setTimeout(
		() => {
			grown = true;
			tellStanding();
		},
		reduceMotion ? 0 : GROW_MS,
	);
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
		if (step.clip === ENTRANCE && !planted) plant();
		stand(watchingFor(manifest?.clips ?? {}));
		return;
	}
	settle();
}

function frameShown(frame: number) {
	const step = current;
	if (!step || !manifest) return;
	if (step.clip === ENTRANCE && !step.hold && !planted) {
		running = frame < STOP_FRAME;
		if (DUST[frame]) kick(DUST[frame]);
		if (frame >= PLANT_FRAME) plant();
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
	clearTimeout(growTimer);
	clearTimeout(thudTimer);
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
<div class="dog-stage" class:cropped class:breathing class:running class:tree-cut={treeCut} aria-hidden="true">
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
<div class="soil" aria-hidden="true" style="--art-soil: url({groundWebp});"></div>
{#if planted}
	<div class="sprouts" aria-hidden="true" style="--sink: {SINK_MS}ms; --shoot: {SHOOT_MS}ms;">
		<img class="sprout" style="--at: 62%; --h: 8%; --ratio: 320 / 226; --delay: 0ms" src={tuft7Flipped} alt="" draggable="false" />
		<img class="sprout" style="--at: 71%; --h: 14%; --ratio: 320 / 252; --delay: {SHOOT_STAGGER_MS}ms" src={tuft9} alt="" draggable="false" />
		<img class="sprout" style="--at: 79%; --h: 9%; --ratio: 320 / 216; --delay: {2 * SHOOT_STAGGER_MS}ms" src={tuft3} alt="" draggable="false" />
	</div>
{/if}
{#if planted && saplingSrc}
	<div class="planting" class:cropped aria-hidden="true" style="--sink: {SINK_MS}ms;">
		<div class="tree">
			<img class="sapling" src={saplingSrc} alt="" draggable="false" />
		</div>
	</div>
{/if}
{#if puffs.length}
	<div class="dust" aria-hidden="true">
		{#each puffs as p (p.id)}
			<span class="puff" style="--x: {p.x}; --y: {p.y}; --size: {p.size}; --drift: {p.drift};" onanimationend={() => settleDust(p.id)}></span>
		{/each}
	</div>
{/if}

<style>
	/* The dog uses a corner of its 2732x2048 frame: every settled clip sits in
	   x 979-1630, y 461-1291, and the entrance walks in from the right, from
	   x 2464. The stage shows that window (x 940-1880, y 420-1320), open on its
	   right for the walk on, so the dog reads at the comp's size instead of as
	   a speck. Clips share the frame, so one crop serves them all. */
	.dog-stage,
	.planting,
	.dust {
		--win-x: 940;
		--win-y: 420;
		--win-w: 940;
		--win-h: 900;
	}

	.dog-stage {
		position: relative;
		width: 100%;
		aspect-ratio: 940 / 900;
		/* Open on the right: the walk on starts off the screen, and the page clips it at the screen's edge. */
		clip-path: inset(0 -100vw 0 0);
		pointer-events: none;
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

	.planting.cropped .sapling {
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

	/* The ground line is the stage's foot, a paw's depth under the paws. The
	   tree draws over the dog and everything else here, and sinks until its
	   root collar (window y 718) is on that line; the line clips the plug. */
	.planting {
		position: absolute;
		inset: 0;
		clip-path: inset(-50% -50% 0);
		pointer-events: none;
		z-index: 4;
	}

	/* These stack with Greenery's grass tufts (z-index 3) and, since the
	   rating page flattens the grass band, with the hero's words (5, 7). */
	.earth,
	.dog-stage,
	.soil,
	.sprouts {
		z-index: 2;
	}

	/* Running, the dog and its dust pass over everything in the hero. */
	.dog-stage.running,
	.dust {
		z-index: 8;
	}

	.tree {
		position: absolute;
		inset: 0;
		translate: 0 calc(100% * (900 - 718) / 900);
	}

	/* The tree's outline below, punched out of the frame: the set-down tree
	   the frames still draw. Open on the right as above. */
	.dog-stage.tree-cut {
		clip-path: polygon(
			evenodd,
			0 0,
			calc(100% + 100vw) 0,
			calc(100% + 100vw) 100%,
			0 100%,
			0 0,
			56.06% 51.11%,
			71.28% 51.11%,
			71.28% 96.22%,
			58.3% 96.22%,
			58.3% 76.67%,
			56.06% 73.56%,
			56.06% 51.11%
		);
	}

	/* Only the tree's own pixels in the entrance's last frame: the leaves reach
	   x 531, the dog's haunch x 541 below them. Window x 527-670, y 460-866. */
	.planting.cropped .sapling {
		clip-path: polygon(56.06% 51.11%, 71.28% 51.11%, 71.28% 96.22%, 58.3% 96.22%, 58.3% 76.67%, 56.06% 73.56%);
	}

	/* The same outline in the full 2732x2048 frame. */
	.planting:not(.cropped) .sapling {
		clip-path: polygon(53.7% 42.97%, 58.93% 42.97%, 58.93% 62.79%, 54.47% 62.79%, 54.47% 54.2%, 53.7% 52.83%);
	}

	/* Ground for the dog where a valley of the crest would leave it on the
	   sky: the hills' own texture at the crest's scale, running down past the
	   stage into the soil fade. Paws end 93.4% down the window. */
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

	/* Bare soil from the ground line down to the roots the page fades into, so
	   no grass of the band shows under the planting. Its soft rim rises just
	   above the line; it is solid where the trunk (x 62.8%) goes in. */
	.soil {
		position: absolute;
		left: 43%;
		width: 40%;
		top: 97.6%;
		height: 24%;
		pointer-events: none;
		background: var(--art-soil) 36% 18% / 800% auto no-repeat;
		-webkit-mask-image: radial-gradient(50% 100% at 50% 100%, #000 90%, transparent);
		mask-image: radial-gradient(50% 100% at 50% 100%, #000 90%, transparent);
	}

	/* Grass shoots out of the planting once the dog sits beside it. */
	.sprouts {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Lit and haloed in fresh green: the tufts are drawn near black, like the hill they come out of. */
	.sprout {
		filter: brightness(1.7) drop-shadow(0 0 1px var(--rt-row-when-fresh)) drop-shadow(0 0 4px var(--rt-row-when-fresh));
		position: absolute;
		left: var(--at);
		top: 100%;
		height: var(--h);
		aspect-ratio: var(--ratio);
		translate: -50% -100%;
		transform-origin: 50% 100%;
	}

	/* A cartoon puff: three round lumps, lit from above. */
	.dust {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.puff,
	.puff::before,
	.puff::after {
		position: absolute;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 30%, var(--rt-cream) 40%, var(--rt-tan) 80%);
	}

	.puff {
		left: calc(100% * var(--x) / var(--win-w));
		top: calc(100% * var(--y) / var(--win-h));
		width: calc(12% * var(--size));
		margin: calc(-12% * var(--size)) 0 0 calc(-6% * var(--size));
		transform-origin: 50% 100%;
		animation: puff 560ms cubic-bezier(0.2, 0.6, 0.3, 1) both;
	}

	.puff::before,
	.puff::after {
		content: "";
		bottom: 0;
		width: 72%;
	}

	.puff::before {
		left: -48%;
	}

	.puff::after {
		right: -44%;
		width: 62%;
	}

	@keyframes puff {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
		15% {
			opacity: 0.9;
		}
		to {
			opacity: 0;
			transform: translate(calc(var(--drift) * 80%), -55%) scale(1.6);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		/* In from where it was set down, then the shoots come up. */
		.tree {
			animation: sink var(--sink) cubic-bezier(0.5, 0, 0.75, 0) both;
		}

		.sprout {
			animation: shoot var(--shoot) cubic-bezier(0.2, 0.9, 0.3, 1.25) calc(var(--sink) + var(--delay)) both;
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

	@keyframes sink {
		from {
			translate: none;
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
