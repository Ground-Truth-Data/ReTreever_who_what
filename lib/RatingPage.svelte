<script lang="ts">
import HeaderRaw from "./ratingAssets/Rating_page_Data_transparency_rating_header.svg?raw";
import OrgsSelectedRaw from "./ratingAssets/Rating_page_orgs_selected.svg?raw";
import OrgsUnselectedRaw from "./ratingAssets/Rating_page_orgs_unselected.svg?raw";
import ProjectsSelectedRaw from "./ratingAssets/Rating_page_projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "./ratingAssets/Rating_page_projects_unselected.svg?raw";
import PercentileBoxRaw from "./ratingAssets/Rating_page_percentile_box.svg?raw";
import InfoButtonRaw from "./ratingAssets/Rating_page_info_button.svg?raw";
import TruthIsInRaw from "./ratingAssets/Rating_page_Truth_is_in.svg?raw";
import TheWeedsRaw from "./ratingAssets/Rating_page_the_weeds_dot_dot_dot.svg?raw";
import DigInRaw from "./ratingAssets/Rating_page_Dig_in.svg?raw";
import DeeperRaw from "./ratingAssets/Rating_page_deeper_period.svg?raw";
import ShovelRaw from "./ratingAssets/Rating_page_shovel.svg?raw";
import YellowLineRaw from "./ratingAssets/Rating_page_bottom_yellow_line.svg?raw";
import skyUrl from "./assets/golden_sky_background.webp";
import pineUrl from "./assets/pub-Rtvr/rating/poly/rp-pine.webp";
import DogStage from "./DogStage.svelte";
import GlobeSpinIcon from "./GlobeSpinIcon.svelte";
import RatingNumber from "./RatingNumber.svelte";
import SearchBar from "./SearchBar.svelte";
import SearchDropdown from "./SearchDropdown.svelte";
import type { SearchResult } from "./resultLoad";
import type { SearchListItem } from "./searchTypes";
import { RATING, depthOf, layerOf, place, type Placed } from "./shardLayout";
import { withLocalPhotos } from "./shardPhotos";
import { byArt, shardId } from "./shared/shardIndex";
import type { WhoWhatRoutes } from "./whoWhatTypes";

let {
	tab,
	result,
	routes = {},
	notice = null,
	clipRoot = undefined,
	items = [],
	topKeys = [],
	listLoading = false,
	onsearch,
	onpick,
	onactivate,
}: {
	tab: "orgs" | "projects";
	result: SearchResult;
	routes?: WhoWhatRoutes;
	notice?: string | null;
	clipRoot?: string;
	items?: SearchListItem[];
	topKeys?: string[];
	listLoading?: boolean;
	onsearch?: (query: string) => void;
	onpick?: (item: SearchListItem, go: boolean) => void;
	onactivate?: () => void;
} = $props();

const noun = $derived(tab === "orgs" ? "organizations" : "projects");
const LIST_ID = "rating-search-list";
let dropdownOpen = $state(false);
let list = $state<SearchDropdown | null>(null);
let activeDescendant = $state<string | undefined>(undefined);
let barEl = $state<HTMLElement | null>(null);

const hrefOf = (item: SearchListItem) =>
	tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);

// The bar arrives filled with this record's name; opened untouched, the list
// offers the most-searched records rather than one match for the page itself.

function submit(q: string) {
	const item = list?.current();
	if (item) {
		query = item.name;
		dropdownOpen = false;
		onpick?.(item, true);
		return;
	}
	onsearch?.(q);
}

function pick(item: SearchListItem, go: boolean) {
	if (go) {
		query = item.name;
		dropdownOpen = false;
	}
	onpick?.(item, go);
}

const PHOTOS = import.meta.glob<string>("./assets/pub-Rtvr/rating/poly/*.webp", {
	eager: true,
	query: "?url",
	import: "default",
});

const shardArt: Record<number, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>("./ratingAssets/poly/Rating_page_RP_poly_*.svg", {
			eager: true,
			query: "?raw",
			import: "default",
		}),
	).map(([path, svg]) => [
		Number(/poly_(\d+)\.svg$/.exec(path)![1]),
		withLocalPhotos(svg, PHOTOS, "rating/poly"),
	]),
);

const ratingShards = byArt("rating");
const idForArt = (art: number) => {
	const entry = ratingShards.get(art);
	return entry ? shardId(entry) : `rating_shard-UNREGISTERED-art${art}`;
};

let query = $state(result.name);
let heroEl = $state<HTMLElement | null>(null);
let lockupEl = $state<HTMLElement | null>(null);
let shards = $state<Placed[]>([]);
const widest = $derived(Math.max(1, ...shards.map((p) => p.w)));

// The state line is the clip state's name until the wording is decided (RT 41 📣).
const stateLine = $derived.by(() => {
	if (result.rating === null) return "Unscored";
	const r = Math.round(result.rating);
	if (r <= 29) return "Opaque data…";
	if (r <= 59) return "Partial data…";
	if (r <= 85) return "Open data…";
	return "Transparent data…";
});

function measure() {
	if (!heroEl || !lockupEl) return;
	const vw = heroEl.clientWidth;
	const h = heroEl.clientHeight;
	if (vw > 0 && h > 0) shards = place(RATING, vw, h, lockupEl.clientWidth + 32);
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

<div class="rating-page" style="--art-sky: url({skyUrl}); --art-pine: url({pineUrl});">
	<section class="rating-hero" bind:this={heroEl}>
		{#each shards as shard (shard.id)}
			{@const depth = depthOf(shard, widest)}
			<div
				id={idForArt(shard.id)}
				class="bg-poly"
				aria-hidden="true"
				style:left="{shard.x}px"
				style:top="{shard.y}px"
				style:width="{shard.w}px"
				style:--depth={depth}
				style:--layer={layerOf(depth)}
				style:transform="rotate({shard.rot ?? 0}deg)"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html shardArt[shard.id]}
			</div>
		{/each}

		<div class="bar-block">
			<nav class="tabs" aria-label="Search by">
				<a href={routes.who ?? null} class="tab-sticker" aria-current={tab === "orgs" ? "page" : undefined}>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html tab === "orgs" ? OrgsSelectedRaw : OrgsUnselectedRaw}
				</a>
				<a href={routes.what ?? null} class="tab-sticker" aria-current={tab === "projects" ? "page" : undefined}>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html tab === "projects" ? ProjectsSelectedRaw : ProjectsUnselectedRaw}
				</a>
			</nav>
			<div class="bar-row">
				<div class="bar" bind:this={barEl}>
					<SearchBar
						bind:value={query}
						bind:dropdownOpen
						id="rating-search"
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
						{items}
						{topKeys}
						query={query === result.name ? "" : query}
						{listLoading}
						{noun}
						listId={LIST_ID}
						{hrefOf}
						within={barEl}
						onpick={pick}
					/>
					{#if notice}
						<p class="search-notice" role="status" aria-live="polite">{notice}</p>
					{/if}
				</div>
				<GlobeSpinIcon class="globe-icon" href={routes.whoMap} />
			</div>
		</div>

		<div class="hero-grid">
			<div class="score-column">
				<div class="header-sticker" aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html HeaderRaw}
				</div>
				<h1 class="name">
					<span class="name-text">{result.name};</span>
					<span class="state-line">{stateLine}</span>
				</h1>
				{#if result.rating !== null}
					<div class="number">
						<RatingNumber rating={result.rating} />
					</div>
				{/if}
				<div class="boxes">
					{#if result.rank !== null}
						<div class="box percentile">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html PercentileBoxRaw}
							<span class="box-value">{result.rank}</span>
						</div>
					{/if}
					<a class="box info" href={routes.why ?? null} aria-label="How the rating works">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html InfoButtonRaw}
					</a>
				</div>
			</div>
			<div class="dog-column">
				<DogStage rating={result.rating} {clipRoot} />
			</div>
		</div>

		<div class="lockup" bind:this={lockupEl} aria-hidden="true">
			<div class="lockup-row">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker truth">{@html TruthIsInRaw}</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker shovel">{@html ShovelRaw}</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker weeds">{@html TheWeedsRaw}</div>
			</div>
			<div class="lockup-row second">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker dig">{@html DigInRaw}</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker deeper">{@html DeeperRaw}</div>
			</div>
		</div>
		<p class="visually-hidden">Truth is in the weeds… Dig in deeper.</p>

		<div class="yellow-line" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html YellowLineRaw}
		</div>
	</section>
</div>

<style>
	.rating-page {
		position: relative;
		min-height: calc(100vh - 5rem);
		width: 100%;
		background: #0b1109;
		overflow-x: clip;
	}

	.rating-hero {
		--pad: clamp(16px, 3vw, 40px);
		position: relative;
		width: 100%;
		box-sizing: border-box;
		min-height: calc(100vh - 5rem);
		/* Top padding is the strip shard's lane: it sits above the tabs, not behind them. */
		padding: clamp(64px, 12vh, 140px) var(--pad) clamp(32px, 5vh, 72px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(16px, 2.5vh, 32px);
		background-color: #cc9f47;
		background-image: var(--art-sky, var(--rtvr-missing-art));
		background-size: cover;
		background-position: center top;
		isolation: isolate;
	}

	/* The comp's sky carries the pine pattern faintly behind everything. */
	.rating-hero::before {
		content: "";
		position: absolute;
		inset: 0;
		background-image: var(--art-pine);
		background-size: 1366px 1024px;
		opacity: 0.05;
		pointer-events: none;
		z-index: 0;
	}

	.bg-poly {
		position: absolute;
		pointer-events: none;
		color: var(--color-gold-shard);
		z-index: calc(2 + var(--layer, 0));
	}

	.bg-poly :global(svg) {
		--lift: calc(0.55 + (var(--depth, 0.5) * 0.75));
		width: 100%;
		height: auto;
		display: block;
		filter:
			drop-shadow(calc(2px * var(--lift)) calc(3px * var(--lift)) calc(7px * var(--lift)) rgb(12 8 1 / 0.22))
			drop-shadow(calc(7px * var(--lift)) calc(10px * var(--lift)) calc(16px * var(--lift)) rgb(12 8 1 / 0.34))
			drop-shadow(calc(18px * var(--lift)) calc(24px * var(--lift)) calc(40px * var(--lift)) rgb(12 8 1 / 0.46));
	}

	/* The search page's block: tabs tucked under the bar's top edge, the bar at
	   the card's width, every size in the bar's own units so they track it. */
	.bar-block {
		--card-max: 576px;
		--bar-scale: calc(min(100vw - 32px, var(--card-max)) / 284.70643);
		position: relative;
		/* Above the hero grid (5): the open list hangs over the header and must take the click. */
		z-index: 7;
		width: 100%;
		max-width: var(--card-max);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.tabs {
		--tab-tuck: min(10px, calc(5 * var(--bar-scale)));
		display: flex;
		align-items: flex-end;
		gap: calc(8 * var(--bar-scale));
		margin: 0 0 calc(0px - var(--tab-tuck)) calc(40 * var(--bar-scale));
		position: relative;
		z-index: 0;
	}

	.tab-sticker {
		display: block;
		height: calc(22.75 * var(--bar-scale));
	}

	.tab-sticker[aria-current="page"] {
		height: calc(32.6 * var(--bar-scale));
	}

	.tab-sticker :global(svg) {
		height: 100%;
		width: auto;
		display: block;
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.3))
			drop-shadow(4px 6px 12px rgb(12 8 1 / 0.42));
	}

	.bar-row {
		position: relative;
		z-index: 1;
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: calc(10 * var(--bar-scale));
	}

	.bar {
		position: relative;
		min-width: 0;
	}

	.bar :global(.search-bar-svg) {
		filter:
			drop-shadow(1px 2px 2px rgb(12 8 1 / 0.7))
			drop-shadow(4px 7px 8px rgb(12 8 1 / 0.55));
	}

	.search-notice {
		position: absolute;
		top: 100%;
		left: 0;
		margin: 4px 0 0;
		color: #1d1405;
		font-family: var(--rt-font-web);
		font-size: 13px;
	}

	.bar-row :global(.globe-icon) {
		width: calc(30 * var(--bar-scale));
		flex-shrink: 0;
	}

	.hero-grid {
		position: relative;
		z-index: 5;
		width: 100%;
		max-width: 1180px;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		align-items: end;
		gap: clamp(12px, 3vw, 48px);
	}

	.score-column {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: clamp(8px, 1.5vh, 18px);
		padding-left: clamp(0px, 6vw, 96px);
	}

	/* Decorative: the pointer passes through to whatever is under it. */
	.header-sticker,
	.lockup,
	.yellow-line {
		pointer-events: none;
	}

	.header-sticker :global(svg) {
		height: clamp(56px, 9vw, 130px);
		width: auto;
		display: block;
		filter: drop-shadow(1px 2px 3px rgb(12 8 1 / 0.35));
	}

	.name {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: var(--rt-font-web);
		color: #1d1405;
		text-shadow:
			0 1px 1px rgb(255 255 255 / 0.35),
			1px 2px 3px rgb(12 8 1 / 0.4);
	}

	.name-text {
		font-size: clamp(20px, 2.6vw, 38px);
		font-weight: 700;
		line-height: 1.15;
		word-break: break-word;
	}

	.state-line {
		font-size: clamp(16px, 1.8vw, 26px);
		font-weight: 700;
		align-self: flex-end;
	}

	.number {
		margin: clamp(4px, 1vh, 12px) 0;
	}

	.boxes {
		display: flex;
		align-items: stretch;
		gap: clamp(10px, 1.5vw, 20px);
	}

	.box {
		position: relative;
		display: block;
		height: clamp(56px, 6.5vw, 92px);
		filter: drop-shadow(2px 3px 6px rgb(12 8 1 / 0.4));
	}

	.box :global(svg) {
		height: 100%;
		width: auto;
		display: block;
	}

	/* The sticker's label sits in its top third; the value fills the rest. */
	.box-value {
		position: absolute;
		left: 0;
		right: 0;
		top: 38%;
		bottom: 0;
		display: grid;
		place-items: center;
		color: var(--rtvr-on-dark);
		font-family: var(--rt-font-web);
		font-weight: 700;
		font-size: clamp(22px, 2.6vw, 38px);
		pointer-events: none;
	}

	.dog-column {
		display: grid;
		justify-items: center;
		align-items: end;
		min-width: 0;
	}

	.lockup {
		position: relative;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		margin-top: auto;
	}

	.lockup-row {
		display: flex;
		align-items: flex-end;
		gap: clamp(6px, 1vw, 14px);
	}

	.lockup-row.second {
		margin-top: calc(var(--lockup-h) * -0.1);
	}

	.sticker :global(svg) {
		--lockup-h: clamp(40px, 5.5vw, 78px);
		height: var(--lockup-h);
		width: auto;
		display: block;
		filter: drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	.sticker.shovel :global(svg) {
		height: calc(var(--lockup-h) * 2.3);
		margin-bottom: calc(var(--lockup-h) * -1.1);
	}

	.yellow-line {
		position: absolute;
		left: 0;
		right: 0;
		bottom: clamp(18px, 3vh, 44px);
		z-index: 4;
		pointer-events: none;
	}

	.yellow-line :global(svg) {
		width: 100%;
		height: auto;
		display: block;
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

	@media (max-width: 860px) {
		.hero-grid {
			grid-template-columns: minmax(0, 1fr);
			justify-items: center;
		}

		.score-column {
			align-items: center;
			padding-left: 0;
			text-align: center;
		}

		.state-line {
			align-self: center;
		}

	}
</style>
