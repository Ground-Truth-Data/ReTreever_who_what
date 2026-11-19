<script lang="ts">
import { WEEDS_TABLES, type WeedsTable } from "../whoWhatTypes";
import { TABLE_LABELS } from "./tallyMath";
import { headX } from "./weedsScroll";
import { m } from "$parent/src/lib/paraglide/messages";

let {
	active,
	onselect,
	panelId,
	progress = 0,
	fresh = false,
}: {
	active: WeedsTable;
	onselect: (table: WeedsTable) => void;
	panelId: string;
	/** How far the scroll is along the tabs: 0 at the first, n - 1 at the last. */
	progress?: number;
	/** No scroll into the run yet: the dig line's head tugs toward the next tab. */
	fresh?: boolean;
} = $props();

const tabId = (t: WeedsTable) => `weeds-tab-${t}`;

let stripEl = $state<HTMLElement | null>(null);

// Each tab's centre in the strip's own scroll coordinates, re-read only when
// the layout changes; a scroll frame does arithmetic, never a DOM read.
let centres = $state<number[]>([]);
let scrollX = $state(0);
let stripW = $state(0);
let room = $state(0);

function measure() {
	const strip = stripEl;
	if (!strip) return;
	centres = [...strip.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => t.offsetLeft + t.offsetWidth / 2);
	stripW = strip.clientWidth;
	room = strip.scrollWidth - strip.clientWidth;
	scrollX = strip.scrollLeft;
}

$effect(() => {
	void active;
	measure();
});

$effect(() => {
	const strip = stripEl;
	if (!strip) return;
	const seen = new ResizeObserver(measure);
	seen.observe(strip);
	return () => seen.disconnect();
});

const head = $derived(Math.min(stripW, Math.max(0, headX(progress, centres) - scrollX)));
const notches = $derived(
	centres.map((c, k) => ({ x: c - scrollX, dug: k <= progress + 0.001 })).filter((n) => n.x >= 0 && n.x <= stripW),
);

function move(from: WeedsTable, step: number) {
	const i = WEEDS_TABLES.indexOf(from);
	const next = WEEDS_TABLES[(i + step + WEEDS_TABLES.length) % WEEDS_TABLES.length];
	onselect(next);
	(stripEl?.querySelector(`#${tabId(next)}`) as HTMLElement | null)?.focus();
}

function keydown(e: KeyboardEvent, t: WeedsTable) {
	if (e.key === "ArrowRight") move(t, 1);
	else if (e.key === "ArrowLeft") move(t, -1);
	else if (e.key === "Home") {
		onselect(WEEDS_TABLES[0]);
		(stripEl?.querySelector(`#${tabId(WEEDS_TABLES[0])}`) as HTMLElement | null)?.focus();
	} else if (e.key === "End") {
		const last = WEEDS_TABLES[WEEDS_TABLES.length - 1];
		onselect(last);
		(stripEl?.querySelector(`#${tabId(last)}`) as HTMLElement | null)?.focus();
	} else return;
	e.preventDefault();
}

// On a phone the strip scrolls sideways; the lit tab comes into view clear of
// the edge fades. The strip alone moves: scrollIntoView would also scroll the
// page to the strip. At either end the scroll clamps, and that fade goes.
const FADE_L = 36;
const FADE_R = 44;
$effect(() => {
	const strip = stripEl;
	const el = strip?.querySelector(`#${tabId(active)}`) as HTMLElement | null;
	if (!strip || !el) return;
	const s = strip.getBoundingClientRect();
	const r = el.getBoundingClientRect();
	if (r.left < s.left + FADE_L) strip.scrollBy({ left: r.left - s.left - FADE_L });
	else if (r.right > s.right - FADE_R) strip.scrollBy({ left: r.right - s.right + FADE_R });
});
</script>

<div class="strip-frame" style:--fade-l="{scrollX > 1 ? FADE_L : 0}px" style:--fade-r="{scrollX < room - 1 ? FADE_R : 0}px">
	<div class="strip" role="tablist" aria-label={m.ww_rating_weeds()} bind:this={stripEl} onscroll={() => (scrollX = stripEl?.scrollLeft ?? 0)}>
		{#each WEEDS_TABLES as t (t)}
			{@const lit = t === active}
			<button
				type="button"
				role="tab"
				id={tabId(t)}
				class="tab"
				class:lit
				aria-selected={lit}
				aria-controls={panelId}
				tabindex={lit ? 0 : -1}
				onclick={() => onselect(t)}
				onkeydown={(e) => keydown(e, t)}
			>
				<span>{TABLE_LABELS[t]}</span>
			</button>
		{/each}
	</div>
	<div class="dig" class:fresh aria-hidden="true">
		<span class="line"></span>
		<span class="fill" style:width="{head}px"></span>
		{#each notches as n, k (k)}
			<span class="notch" class:dug={n.dug} style:left="{n.x}px"></span>
		{/each}
		<span class="head" style:transform="translateX({head}px)"><i></i></span>
	</div>
</div>

<style>
	/* More tabs than fit: the frame fades at the edge the strip can still
	   scroll toward, so the cut reads as "more this way". A mask, so it fades
	   to whatever ground the host paints. */
	.strip-frame {
		position: relative;
		width: 100%;
		mask-image: linear-gradient(to right, transparent, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent);
	}

	/* The dig line: a root under the tabs that the scroll draws from tab to tab. */
	.dig {
		position: relative;
		height: 14px;
		margin-top: 6px;
	}

	.line,
	.fill,
	.notch,
	.head {
		position: absolute;
		pointer-events: none;
	}

	.line {
		left: 0;
		right: 0;
		top: 6px;
		height: 2px;
		border-radius: 1px;
		background: color-mix(in srgb, var(--rtvr-on-dark) 18%, transparent);
	}

	.fill {
		left: 0;
		top: 5px;
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(90deg, var(--color-gold-shard), var(--color-gold-bar));
	}

	.notch {
		top: 3px;
		width: 8px;
		height: 8px;
		margin-left: -4px;
		box-sizing: border-box;
		border-radius: 50%;
		background: var(--rtvr-ink);
		border: 1.5px solid color-mix(in srgb, var(--rtvr-on-dark) 35%, transparent);
	}

	.notch.dug {
		background: var(--color-gold-shard);
		border-color: var(--color-gold-shard);
	}

	.head {
		left: 0;
		top: 0;
	}

	.head i {
		display: block;
		width: 14px;
		height: 14px;
		margin-left: -7px;
		border-radius: 50%;
		background: var(--color-gold-shard);
		box-shadow:
			0 0 0 3px rgb(240 182 10 / 0.25),
			0 0 14px rgb(240 182 10 / 0.6);
	}

	.fresh .head i {
		animation: tug 1.6s ease-in-out infinite;
	}

	@keyframes tug {
		0%,
		55%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(14px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fresh .head i {
			animation: none;
		}
	}

	.strip {
		position: relative;
		z-index: 1;
		/* Equal columns that share the strip, never narrower than the longest label: past that it scrolls. */
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(calc(var(--tab-h) * 2.1), 1fr);
		gap: 2px;
		padding: 0 4px;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	.tab {
		height: var(--tab-h);
		margin: 0;
		padding: 0 2px;
		border: none;
		border-radius: 2px;
		background: #444;
		color: #fdfdfd;
		font: italic 500 calc(var(--tab-h) * 0.3) var(--rt-font-web);
		white-space: nowrap;
		cursor: pointer;
	}

	.tab.lit {
		background: #000;
		font: 400 calc(var(--tab-h) * 0.36) var(--rt-font-display);
	}

	/* theme.css inks and embosses every aria-selected tab as if it sat on gold; this one sits on black. */
	.tab.lit span {
		color: var(--rt-yellow);
		text-shadow: none;
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}
</style>
