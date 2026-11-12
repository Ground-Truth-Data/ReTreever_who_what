<script lang="ts">
// The hero's number with the name and state line, riding under the nav once
// the real number has gone under it: born where that number stood and handed
// back there, sticky in the page's dig-head track so the lockup's end lets it
// go, unless the ledger waits for it: then it comes down into the ledger's
// number as the page scrolls. Never a control.
import { untrack } from "svelte";
import RatingNumber from "./RatingNumber.svelte";
import { m } from "$parent/src/lib/paraglide/messages";

let {
	rating,
	name,
	stateLine,
	on,
	overSoil,
	numberEl,
	land = 0,
	landOn = () => null,
}: {
	rating: number;
	name: string;
	stateLine: string;
	/** True while the real number is under the nav; the flip each way plays the FLIP. */
	on: boolean;
	/** The follower's own top is past the hero's foot: light text on the soil. */
	overSoil: boolean;
	/** The hero's real number, measured once at each flip. */
	numberEl: HTMLElement | null;
	/** How far down into the ledger, 0–1; at 1 the ledger's own number has it. */
	land?: number;
	/** The ledger's number, where the travel ends. */
	landOn?: () => HTMLElement | null;
} = $props();

let wrap = $state<HTMLElement | null>(null);
let body = $state<HTMLElement | null>(null);
let glyphs = $state<HTMLElement | null>(null);
let shown = $state(false);

const FLIP_MS = 260;
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The transform that lays this follower's number over the real one: the body
// scales about its own top-left corner, so the glyphs' offset scales with it.
function atNumber(): string | null {
	if (!body || !glyphs || !numberEl) return null;
	const b = body.getBoundingClientRect();
	const g = glyphs.getBoundingClientRect();
	const real = numberEl.getBoundingClientRect();
	if (!g.height || !real.height) return null;
	const s = real.height / g.height;
	const dx = real.left - b.left - s * (g.left - b.left);
	const dy = real.top - b.top - s * (g.top - b.top);
	return `translate(${dx}px, ${dy}px) scale(${s})`;
}

// Measured from the untransformed layout (the sticky wrapper and offsets), so
// each scroll frame lerps from where the follower rides to where the ledger's
// number stands, whatever this frame's transform is.
$effect(() => {
	const node = body;
	const p = land;
	if (!node || !wrap) return;
	const src = glyphs?.querySelector<HTMLElement>(".rating-number");
	const dest = p > 0 ? landOn()?.getBoundingClientRect() : null;
	if (!src || !dest?.height || !src.offsetHeight) {
		node.style.transform = "";
		return;
	}
	const w = wrap.getBoundingClientRect();
	const ox = w.left + node.offsetLeft;
	const oy = w.top + node.offsetTop;
	// Across and smaller first, then down: it clears the lockup's first word
	// before the lockup rises past it, and settles into the ledger.
	const ex = 1 - (1 - p) ** 4;
	const ey = p < 0.5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2;
	const k = 1 + ex * (dest.height / src.offsetHeight - 1);
	const x = src.offsetLeft + ex * (dest.left - ox - src.offsetLeft);
	const y = src.offsetTop + ey * (dest.top - oy - src.offsetTop);
	node.style.transform = `translate(${x - k * src.offsetLeft}px, ${y - k * src.offsetTop}px) scale(${k})`;
});

$effect(() => {
	const node = body;
	const target = on;
	if (!node) return;
	const wasShown = untrack(() => shown);
	for (const a of node.getAnimations()) a.cancel();
	if (target) {
		shown = true;
		if (reduced()) return;
		const from = atNumber();
		if (from) node.animate([{ transform: from }, { transform: "none" }], { duration: FLIP_MS, easing: EASE });
		return;
	}
	if (!wasShown) return;
	const to = reduced() ? null : atNumber();
	if (!to) {
		shown = false;
		return;
	}
	const back = node.animate([{ transform: "none" }, { transform: to }], { duration: FLIP_MS, easing: EASE });
	back.finished.then(() => {
		shown = false;
	}).catch(() => {});
});
</script>

<div class="follower" class:travelling={land > 0} aria-hidden="true" bind:this={wrap}>
	<div class="body" class:shown class:soil={overSoil} class:landed={land >= 1} bind:this={body}>
		<span class="glyphs" bind:this={glyphs}><RatingNumber text={rating.toFixed(1)} /></span>
		<span class="words" style:opacity={land > 0 ? Math.max(0, 1 - land * 3) : null}>
			<span class="name">{m.ww_rating_name_line({ name })}</span>
			<span class="state">{stateLine}</span>
		</span>
	</div>
</div>

<style>
	/* Above the hero's top row (7) and the weeds track (6), under the tally
	   (20) until it travels into the tally's panel. */
	.follower {
		position: sticky;
		top: calc(var(--host-chrome, 5rem) + 12px);
		height: 0;
		z-index: 8;
		pointer-events: none;
	}

	.follower.travelling {
		z-index: 21;
	}

	/* Where the number stood: the hero's gutter, its grid's centring margin
	   and the score column's padding. */
	.body {
		--glyph-h: clamp(48px, 7vw, 110px);
		position: absolute;
		top: 0;
		left: calc(max(var(--pad, 16px), (100% - 1180px) / 2) + clamp(0px, 6vw, 96px));
		display: flex;
		align-items: flex-start;
		gap: clamp(8px, 1.2vw, 18px);
		transform-origin: 0 0;
		font-family: var(--rt-font-web);
		color: #1d1405;
		text-shadow:
			0 1px 1px rgb(255 255 255 / 0.35),
			1px 2px 3px rgb(12 8 1 / 0.4);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 120ms ease-out,
			visibility 0s linear 120ms,
			color 200ms ease,
			text-shadow 200ms ease;
	}

	.body.shown {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 120ms ease-out,
			visibility 0s,
			color 200ms ease,
			text-shadow 200ms ease;
	}

	/* The ledger's number has it now: gone in the same frame, so it never shows twice. */
	.body.shown.landed {
		opacity: 0;
		visibility: hidden;
		transition: none;
	}

	.body.soil {
		color: var(--rtvr-on-dark, #fff);
		text-shadow:
			0 2px 6px rgb(0 0 0 / 0.8),
			0 0 24px rgb(0 0 0 / 0.6);
	}

	.glyphs {
		display: block;
		flex: 0 0 auto;
	}

	.words {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-top: calc(var(--glyph-h) * 0.08);
		max-width: min(34ch, 40vw);
	}

	.name {
		font-size: clamp(15px, 1.5vw, 22px);
		font-weight: 700;
		line-height: 1.15;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		word-break: break-word;
	}

	.state {
		font-size: clamp(14px, 1.2vw, 18px);
		font-weight: 700;
	}

	@media (max-width: 860px) {
		.body {
			left: var(--pad, 16px);
		}
	}

	@media (max-width: 720px) {
		.body {
			--glyph-h: clamp(40px, 11vw, 56px);
			max-width: calc(100vw - 32px);
		}

		.words {
			max-width: none;
			min-width: 0;
		}
	}
</style>
