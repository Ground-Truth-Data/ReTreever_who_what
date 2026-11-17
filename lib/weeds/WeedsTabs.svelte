<script lang="ts">
import ProjectsSelectedRaw from "../assets/svg/rating/Rating_page_projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "../assets/svg/rating/Rating_page_projects_unselected.svg?raw";
import CropSelectedRaw from "../assets/svg/rating/Rating_page_crop_Selected.svg?raw";
import CropUnselectedRaw from "../assets/svg/rating/Rating_page_crop_unselected.svg?raw";
import PlantingSelectedRaw from "../assets/svg/rating/Rating_page_planting_Selected.svg?raw";
import PlantingUnselectedRaw from "../assets/svg/rating/Rating_page_planting_unselected.svg?raw";
import LandSelectedRaw from "../assets/svg/rating/Rating_page_land_Selected.svg?raw";
import LandUnselectedRaw from "../assets/svg/rating/Rating_page_land_unselected.svg?raw";
import PolymorphicSelectedRaw from "../assets/svg/rating/Rating_page_polymorphic_Selected.svg?raw";
import PolymorphicUnselectedRaw from "../assets/svg/rating/Rating_page_polymorphic_unselected.svg?raw";
import StakeholdersSelectedRaw from "../assets/svg/rating/Rating_page_stakeholders_Selected.svg?raw";
import StakeholdersUnselectedRaw from "../assets/svg/rating/Rating_page_stakeholders_unselected.svg?raw";
import SourcesSelectedRaw from "../assets/svg/rating/Rating_page_sources_Selected.svg?raw";
import SourcesUnselectedRaw from "../assets/svg/rating/Rating_page_sources_unselected.svg?raw";
import { WEEDS_TABLES, type WeedsTable } from "../whoWhatTypes";
import { svgFit } from "../stage/svgFit";
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

// `drawn` is the word the art carries.
const STICKERS: Record<WeedsTable, { drawn: string; lit: string; dim: string }> = {
	projects: { drawn: "Projects", lit: ProjectsSelectedRaw, dim: ProjectsUnselectedRaw },
	crop: { drawn: "Crop", lit: CropSelectedRaw, dim: CropUnselectedRaw },
	planting: { drawn: "Planting", lit: PlantingSelectedRaw, dim: PlantingUnselectedRaw },
	land: { drawn: "Land", lit: LandSelectedRaw, dim: LandUnselectedRaw },
	polymorphic: { drawn: "Polymorphic", lit: PolymorphicSelectedRaw, dim: PolymorphicUnselectedRaw },
	stakeholders: { drawn: "Stakeholders", lit: StakeholdersSelectedRaw, dim: StakeholdersUnselectedRaw },
	sources: { drawn: "Sources", lit: SourcesSelectedRaw, dim: SourcesUnselectedRaw },
};

// Each sticker's viewBox is its drawn box (the import script trims it), so its width over its height sizes the tab.
function aspect(raw: string): number {
	const box = /viewBox="([^"]+)"/.exec(raw)?.[1].trim().split(/[\s,]+/).map(Number);
	if (!box || !(box[2] > 0) || !(box[3] > 0)) throw new Error("weeds tab sticker without a viewBox");
	return box[2] / box[3];
}

const ART = Object.fromEntries(
	WEEDS_TABLES.map((t) => {
		const { drawn, lit, dim } = STICKERS[t];
		const swap = [[drawn, TABLE_LABELS[t]]] as const;
		return [t, { lit: svgFit(lit, swap), dim: svgFit(dim, swap), litAspect: aspect(lit), dimAspect: aspect(dim) }];
	}),
) as Record<WeedsTable, { lit: string; dim: string; litAspect: number; dimAspect: number }>;

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
				style:--aspect={lit ? ART[t].litAspect : ART[t].dimAspect}
				onclick={() => onselect(t)}
				onkeydown={(e) => keydown(e, t)}
			>
				<span class="art" aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html lit ? ART[t].lit : ART[t].dim}
				</span>
				<span class="visually-hidden">{TABLE_LABELS[t]}</span>
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
		display: flex;
		align-items: flex-end;
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
		flex: none;
		display: block;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		/* The drawn box's height is the strip's unit; the width follows each sticker's own aspect. */
		height: var(--tab-h);
		width: calc(var(--tab-h) * var(--aspect));
		overflow: hidden;
		border-radius: 2px;
	}

	/* One lit height for every tab: the art's own lit boxes are 1.5x their dim
	   ones in six pairs, but 1.86x in the Projects pair. */
	.tab.lit {
		height: calc(var(--tab-h) * 1.5);
		width: calc(var(--tab-h) * 1.5 * var(--aspect));
	}

	/* A sticker's svg can round a fraction taller than the tab. Clipped here,
	   not only at the button, or Chromium counts it as scroll room and a wheel
	   over the strip scrolls the tabs' tops away. */
	.art {
		display: block;
		width: 100%;
		height: 100%;
		overflow: clip;
	}

	.art :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	.tab.lit .art :global(svg) {
		filter:
			drop-shadow(0 0 2px var(--color-gold-shard))
			drop-shadow(0 0 10px rgb(240 182 10 / 0.55));
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
