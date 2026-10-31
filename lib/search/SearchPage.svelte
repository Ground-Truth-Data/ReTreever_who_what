<script lang="ts">
import FindRaw from "../assets/svg/search/Search_page_Find.svg?raw";
import TruthInReforestationRaw from "../assets/svg/search/Search_page_Truth_in_Reforestation.svg?raw";
import OrgsSelectedRaw from "../assets/svg/search/Search_page_Orgs_Selected.svg?raw";
import OrgsUnselectedRaw from "../assets/svg/search/Search_page_Orgs_Unselected.svg?raw";
import ProjectsSelectedRaw from "../assets/svg/search/Search_page_Projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "../assets/svg/search/Search_page_Projects_Unselected.svg?raw";
import GrassMascot from "./GrassMascot.svelte";
import Greenery from "../stage/Greenery.svelte";
import GlobeSpinIcon from "../stage/GlobeSpinIcon.svelte";
import SearchBar from "./SearchBar.svelte";
import SearchDropdown from "./SearchDropdown.svelte";
import LessonHand from "../stage/LessonHand.svelte";
import HelpSticker from "../stage/HelpSticker.svelte";
import MiddleDividerRaw from "../assets/svg/search/poly/Search_page_Middle_Divider.svg?raw";

import skyUrl from "../assets/golden_sky_background.webp";
import hillFillWebp from "../assets/pub-Rtvr/home/hill_fill.webp";
import hillFillAvif from "../assets/pub-Rtvr/home/hill_fill.avif";
import { shard, shardId } from "../stage/shardIndex";
import { withLocalPhotos } from "../stage/svgPhotos";
import type { WhoWhatRoutes } from "../whoWhatTypes";
import type { SearchListItem } from "./searchTypes";

let {
	query = $bindable(""),
	activeTab = "orgs",
	dropdownOpen = $bindable(false),
	selected = $bindable(null),
	notice = null,
	routes = {},
	mapHref = undefined,
	orgs = [],
	projects = [],
	onsearch,
	onpick,
	onactivate,
	listLoading = false,
	clipRoot = undefined,
}: {
	query?: string;
	activeTab?: "orgs" | "projects";
	dropdownOpen?: boolean;
	/** Names are not unique; the route navigates by this row's key. */
	selected?: SearchListItem | null;
	notice?: string | null;
	mapHref?: string;
	routes?: WhoWhatRoutes;
	orgs?: SearchListItem[];
	projects?: SearchListItem[];
	onsearch?: (query: string, tab: "orgs" | "projects") => void;
	/** `go` false: a modified click, the row's own link navigates and the route only counts the pick. */
	onpick?: (item: SearchListItem, tab: "orgs" | "projects", go: boolean) => void;
	onactivate?: () => void;
	listLoading?: boolean;
	/** Where the frame clips are served from; the list's fetching clip needs it. */
	clipRoot?: string;
} = $props();

const listItems = $derived(activeTab === "orgs" ? orgs : projects);
const noun = $derived(activeTab === "orgs" ? "organizations" : "projects");

const LIST_ID = "home-search-list";
let bar = $state<SearchBar | null>(null);
let list = $state<SearchDropdown | null>(null);
let tabsEl = $state<HTMLElement | null>(null);
// The lesson lights the other tab without navigating; null is the page's own.
let litOverride = $state<number | null>(null);
const litTab = $derived(litOverride ?? (activeTab === "orgs" ? 0 : 1));
let activeDescendant = $state<string | undefined>(undefined);

function submit(q: string) {
	const item = list?.current();
	if (item) {
		selectItem(item);
		onsearch?.(item.name, activeTab);
		return;
	}
	onsearch?.(q, activeTab);
}

function selectItem(item: SearchListItem) {
	query = item.name;
	selected = item;
	dropdownOpen = false;
}

const hrefOf = (item: SearchListItem) =>
	activeTab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);

function pick(item: SearchListItem, go: boolean) {
	if (go) selectItem(item);
	onpick?.(item, activeTab, go);
}

let searchWrapEl = $state<HTMLElement | null>(null);

const PHOTOS = import.meta.glob<string>(
	"../assets/pub-Rtvr/home/poly/*.webp",
	{ eager: true, query: "?url", import: "default" },
);
const localPhotos = (svg: string) => withLocalPhotos(svg, PHOTOS, "home/poly");

let heroEl = $state<HTMLElement | null>(null);
let lessonHand = $state<LessonHand | null>(null);
const lessonPlaying = $derived(lessonHand?.playing() ?? false);
const pressHelp = () => (lessonPlaying ? lessonHand?.cancel() : void lessonHand?.play());

const lessonDoors = {
	tabs: () => (tabsEl ? [...tabsEl.querySelectorAll<HTMLElement>(".tab-sticker")] : []),
	litTab: () => litTab,
	setLitTab: (i: number | null) => (litOverride = i),
	input: () => searchWrapEl?.querySelector<HTMLElement>(".search-input") ?? null,
	row: (i: number) => (list ? document.getElementById(list.rowId(i)) : null),
	globe: () => heroEl?.querySelector<HTMLElement>(".globe-icon") ?? null,
	typeIn: (text: string, ms: number) => bar?.typeIn(text, ms) ?? Promise.resolve(),
	clear: () => bar?.clear(),
	highlight: (i: number) => void list?.highlight(i),
};
const lessonFacts = () => ({
	focusWithin: !!searchWrapEl?.contains(document.activeElement),
	dropdownOpen,
	pageReady: listItems.length > 0,
});

const dividerId = shardId(shard(26));

// The fold rule in CSS needs the hero's page offset, which only the DOM knows.
let lastHeroTop = -1;
function measure() {
	if (!heroEl) return;
	const top = Math.round(heroEl.getBoundingClientRect().top + window.scrollY);
	if (top !== lastHeroTop) {
		lastHeroTop = top;
		heroEl.style.setProperty("--hero-top", `${top}px`);
	}
}

$effect(() => {
	if (!heroEl) return;
	measure();
	let raf = 0;
	const schedule = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			measure();
		});
	};
	const ro = new ResizeObserver(schedule);
	ro.observe(heroEl);
	window.addEventListener("resize", schedule);

	return () => {
		if (raf) cancelAnimationFrame(raf);
		ro.disconnect();
		window.removeEventListener("resize", schedule);
	};
});
</script>

<!-- Missing asset falls through to --rtvr-missing-art. -->
<div class="home-search-page" style="--art-sky: url({skyUrl}); --art-hill-fill-webp: url({hillFillWebp}); --art-hill-fill-avif: url({hillFillAvif});">
	<section class="hero-section" bind:this={heroEl}>
		<Greenery>
			<GrassMascot ground="grass" />
		</Greenery>

		<div class="search-card">
			<nav class="tabs" aria-label="Search by" bind:this={tabsEl}>
				<a
					href={routes.who ?? null}
					class="tab-sticker"
					aria-current={litTab === 0 ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html litTab === 0 ? OrgsSelectedRaw : OrgsUnselectedRaw}
				</a>
				<a
					href={routes.what ?? null}
					class="tab-sticker"
					aria-current={litTab === 1 ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html litTab === 1 ? ProjectsSelectedRaw : ProjectsUnselectedRaw}
				</a>
			</nav>

			<div class="search-bar-wrap" bind:this={searchWrapEl}>
				<SearchBar
					bind:this={bar}
					bind:value={query}
					bind:dropdownOpen
					placeholder="Search {noun}…"
					ariaLabel="Search {noun}"
					onsearch={submit}
					{onactivate}
					onkeynav={(dir) => list?.move(dir)}
					listId={LIST_ID}
					{activeDescendant}
				/>

				<SearchDropdown
					bind:this={list}
					bind:open={dropdownOpen}
					bind:activeDescendant
					items={listItems}
					{query}
					{listLoading}
					{noun}
					listId={LIST_ID}
					{hrefOf}
					within={searchWrapEl}
					{clipRoot}
					onpick={pick}
				/>

				{#if notice}
					<p class="search-notice" role="status" aria-live="polite">{notice}</p>
				{/if}
			</div>

			<div class="caption-row">
				<p class="search-caption">Search transparency rating</p>
				<GlobeSpinIcon class="globe-icon" href={mapHref ?? routes.whoMap} />
				<HelpSticker playing={lessonPlaying} onpress={pressHelp} />
			</div>
		</div>
	</section>

	<div class="middle-divider" id={dividerId}>
		<div class="middle-divider-photo" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html localPhotos(MiddleDividerRaw)}
		</div>
	</div>

	<LessonHand bind:this={lessonHand} name="search" facts={lessonFacts} search={lessonDoors} />

	<section class="headline-section">
		<div class="headline-greenery" aria-hidden="true"></div>

		<div class="headline">
			<div class="headline-find" aria-hidden="true">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html FindRaw}
			</div>
			<div class="headline-truth" aria-hidden="true">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html TruthInReforestationRaw}
			</div>
			<h1 class="visually-hidden">Find Truth in Reforestation.</h1>
		</div>
	</section>
</div>

<style>
	.home-search-page {
		position: relative;
		min-height: calc(100vh - 5rem);
		width: 100%;
		box-sizing: border-box;
		background: #0b1109;
		display: flex;
		flex-direction: column;
		/* clip, not hidden: hidden makes a scroll container and hands trackpad
		   gestures a hidden x-axis to rubber-band against. */
		overflow-x: clip;
	}

	/* Band ratios come from the 2049px-wide mobile canvas the art was exported on;
	   --art is capped so a desktop viewport doesn't scale them into huge bands. */
	.hero-section,
	.headline-section {
		--art: min(100vw, 1200px);
		--upper-band: calc(var(--art) * 0.381);
		--greenery-h: max(calc(var(--art) * 0.44), 230px);
		--hero-top: 80px;
		/* 416px = the search card plus room, a FLOOR — grows whenever the card does. */
		--hero-chrome: calc(var(--hero-top) + 416px);
		position: relative;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: clamp(28px, 7vh, 80px) 16px calc(var(--greenery-h) + 16px);
	}

	.hero-section {
		min-height: min(56vh, 620px);
		/* THE FOLD RULE: the band is bottom:0, so capping it to viewport minus
		   chrome lands its foot ON the fold; clipping the section would hide the card. */
		--greenery-h: clamp(
			230px,
			calc(var(--art) * 0.44),
			max(230px, calc(100dvh - var(--hero-chrome)))
		);
		max-height: 100dvh;
		background-color: #cc9f47;
		background-image: var(--art-sky, var(--rtvr-missing-art));
		background-size: cover;
		background-position: center top;
		background-repeat: no-repeat;
	}

	.headline-section {
		min-height: min(50vh, 560px);
		padding-top: clamp(48px, 12vh, 130px);
		padding-bottom: max(calc(var(--art) * 0.25), 150px);
		background: #0b1109;
	}

	/* Cropped below the crest's trough so no glow shows under the divider. Plain
	   WebP, then image-set() with AVIF first — Safari < 16.4 drops the image-set
	   line and keeps the WebP. */
	.headline-greenery {
		position: absolute;
		inset: 0;
		z-index: 0;
		background-repeat: no-repeat;
		background-image: var(--art-hill-fill-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-hill-fill-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-hill-fill-webp, var(--rtvr-missing-art)) type("image/webp")
		);
		background-size: cover;
		background-position: top center;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* --card-max feeds both max-width and --bar-scale, so every "matched to the
	   input" size tracks the card's real width. */
	.search-card {
		--card-max: 576px;
		position: relative;
		width: 100%;
		max-width: var(--card-max);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(8px, 1.4vw, 16px);
		z-index: 5;
		--bar-scale: calc(min(100vw - 32px, var(--card-max)) / 284.70643);
	}

	/* Tabs tuck under the bar's top edge via negative margin, not absolute
	   positioning — the row must keep its height in flow for the fold rule. */
	.tabs {
		/* Capped at 10px: scaled up it crops the shorter tab's label; on a phone it
		   must shrink with the tab or the label vanishes under the bar. */
		--tab-tuck: min(10px, calc(5 * var(--bar-scale)));
		/* Bar units, like the caption: 46px and 66px tall when the bar is full width. */
		--tab-h-idle: calc(22.75 * var(--bar-scale));
		--tab-h-active: calc(32.6 * var(--bar-scale));
		display: flex;
		align-items: flex-end;
		gap: calc(8 * var(--bar-scale));
		/* No padding-bottom: it would add back what this margin removes. */
		margin-bottom: calc(0px - var(--tab-tuck) - clamp(8px, 1.4vw, 16px));
		position: relative;
		z-index: 0;
	}

	.search-bar-wrap {
		position: relative;
		width: 100%;
		z-index: 1;
	}

	.search-notice {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		margin: 0;
		color: #1d1405;
		font-size: calc(13 * var(--bar-scale, 1));
		line-height: 1.3;
		text-align: center;
		text-shadow: 0 1px 1px rgb(255 255 255 / 0.35);
		pointer-events: none;
	}

	@media (max-width: 550px) {
		.search-notice {
			font-size: 13px;
		}
	}

	.tab-sticker {
		display: block;
		height: var(--tab-h-idle);
		transition: height 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.tab-sticker[aria-current="page"] {
		height: var(--tab-h-active);
	}

	/* Brighten, never rotate or grow: a tilt swings the tucked edge out from
	   under the bar, and size already means "selected". */
	.tab-sticker:hover :global(svg),
	.tab-sticker:focus-visible :global(svg) {
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.34))
			drop-shadow(4px 8px 14px rgb(12 8 1 / 0.48))
			drop-shadow(12px 18px 28px rgb(12 8 1 / 0.56))
			brightness(1.18);
	}

	/* Alphas ascend outward with a blurred near shadow, or a crisp dark rule
	   along the tucked seam undoes the tuck. */
	.tab-sticker :global(svg) {
		height: 100%;
		width: auto;
		display: block;
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.3))
			drop-shadow(4px 6px 12px rgb(12 8 1 / 0.42))
			drop-shadow(10px 14px 22px rgb(12 8 1 / 0.5));
		transition: filter 0.2s ease;
	}

	.search-bar-wrap :global(.search-bar-svg) {
		filter:
			drop-shadow(1px 2px 2px rgb(12 8 1 / 0.7))
			drop-shadow(4px 7px 8px rgb(12 8 1 / 0.55))
			drop-shadow(14px 20px 28px rgb(12 8 1 / 0.42));
	}

	.caption-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(10px, 2.5vw, 28px);
		width: 100%;
	}

	/* Caption font-size uses the bar's SVG user units so it tracks the input
	   at every width. */
	.search-caption {
		flex: 0 1 auto;
		max-width: 420px;
		text-align: center;
		color: #1d1405;
		font-size: calc(18 * var(--bar-scale));
		line-height: 1.35;
		margin: 0;
		text-shadow:
			0 1px 1px rgb(255 255 255 / 0.35),
			1px 2px 3px rgb(12 8 1 / 0.4);
	}

	.caption-row :global(.globe-icon) {
		width: calc(74 * var(--bar-scale));
		flex-shrink: 0;
		filter:
			drop-shadow(1px 2px 1px rgb(12 8 1 / 0.7))
			drop-shadow(3px 5px 6px rgb(12 8 1 / 0.5))
			drop-shadow(9px 12px 18px rgb(12 8 1 / 0.38));
	}

	/* As tall as the globe: its width on the sprite's 213:160 frame. */
	.caption-row :global(.help-sticker) {
		height: calc(74 * var(--bar-scale) * 160 / 213);
	}

	/* Wider than the viewport so both jagged ends are cut by the page edge. */
	.middle-divider {
		position: relative;
		align-self: center;
		width: 116vw;
		flex-shrink: 0;
		aspect-ratio: 1254.0259 / 94.484817;
		overflow: visible;
		z-index: 3;
		background: var(--rtvr-ink, #171d31);
	}

	/* The divider is shard 26; its gold outline inherits from here. */
	.middle-divider-photo {
		position: absolute;
		inset: 0;
		color: var(--color-gold-shard);
	}

	.middle-divider-photo :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	.headline {
		position: relative;
		display: flex;
		align-items: center;
		gap: clamp(8px, 2vw, 24px);
		flex-wrap: wrap;
		justify-content: center;
		z-index: 5;
	}

	.headline-find :global(svg),
	.headline-truth :global(svg) {
		height: clamp(64px, 9vw, 130px);
		width: auto;
		display: block;
	}

	@media (max-width: 640px) {
		.headline {
			flex-direction: column;
			gap: 4px;
		}

		.caption-row {
			gap: 10px;
		}
	}

	/* 550px is the Get Cache breakpoint, where the bar spans the screen. */
	@media (max-width: 550px) {
		.search-caption {
			font-size: max(13px, calc(14.3 * var(--bar-scale)));
		}

		.caption-row :global(.globe-icon) {
			width: max(40px, calc(44.5 * var(--bar-scale)));
		}

		.caption-row :global(.help-sticker) {
			height: calc(max(40px, calc(44.5 * var(--bar-scale))) * 160 / 213);
		}
	}
</style>
