<script lang="ts">
import HeaderRaw from "../assets/svg/rating/Rating_page_Data_transparency_rating_header.svg?raw";
import OrgsSelectedRaw from "../assets/svg/rating/Rating_page_orgs_selected.svg?raw";
import OrgsUnselectedRaw from "../assets/svg/rating/Rating_page_orgs_unselected.svg?raw";
import ProjectsSelectedRaw from "../assets/svg/rating/Rating_page_projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "../assets/svg/rating/Rating_page_projects_unselected.svg?raw";
import TruthIsInRaw from "../assets/svg/rating/Rating_page_Truth_is_in.svg?raw";
import TheWeedsRaw from "../assets/svg/rating/Rating_page_the_weeds_dot_dot_dot.svg?raw";
import DigInRaw from "../assets/svg/rating/Rating_page_Dig_in.svg?raw";
import DeeperRaw from "../assets/svg/rating/Rating_page_deeper_period.svg?raw";
import ShovelRaw from "../assets/svg/rating/Rating_page_shovel.svg?raw";
import YellowLineRaw from "../assets/svg/rating/Rating_page_bottom_yellow_line.svg?raw";
import skyUrl from "../assets/golden_sky_background.webp";
import pineUrl from "../assets/pub-Rtvr/rating/poly/rp-pine.webp";
import DogStage from "./DogStage.svelte";
import GlobeSpinIcon from "../stage/GlobeSpinIcon.svelte";
import Greenery from "../stage/Greenery.svelte";
import RatingNumber from "./RatingNumber.svelte";
import SearchBar from "../search/SearchBar.svelte";
import SearchDropdown from "../search/SearchDropdown.svelte";
import WeedsSection from "../weeds/WeedsSection.svelte";
import type { SearchResult } from "./resultLoad";
import type { SearchListItem } from "../search/searchTypes";
import { ratingState, type RatingState } from "./ratingState";
import type { WeedsTable, WhoWhatRoutes } from "../whoWhatTypes";

let {
	tab,
	record,
	routes = {},
	notice = null,
	clipRoot = undefined,
	items = [],
	listLoading = false,
	onsearch,
	onpick,
	onactivate,
	weedsHref = undefined,
	onopenproject = undefined,
}: {
	tab: "orgs" | "projects";
	/** Null while the host streams it: the shell paints and the dog is the loading state. */
	record: SearchResult | null;
	routes?: WhoWhatRoutes;
	notice?: string | null;
	clipRoot?: string;
	items?: SearchListItem[];
	listLoading?: boolean;
	onsearch?: (query: string) => void;
	onpick?: (item: SearchListItem, go: boolean) => void;
	onactivate?: () => void;
	/** The host's URL for one weeds table of this record; absent, no weeds. */
	weedsHref?: (table: WeedsTable) => string;
	onopenproject?: (projectKey: string) => void;
} = $props();

const noun = $derived(tab === "orgs" ? "organizations" : "projects");
const LIST_ID = "rating-search-list";
let dropdownOpen = $state(false);
let list = $state<SearchDropdown | null>(null);
let activeDescendant = $state<string | undefined>(undefined);
let barEl = $state<HTMLElement | null>(null);

const hrefOf = (item: SearchListItem) =>
	tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);

// The bar carries this record's name once it lands; opened untouched, the list
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

let query = $state(record?.name ?? "");
$effect(() => {
	if (record) query = record.name;
});

// The number waits for the dog to stand, lands big over the hero and settles
// into place, then its period lands; the dog turns half a beat after that.
let dogStanding = $state(false);
let armed = $state(false);
let revealed = $state(false);
let periodIn = $state(false);
let heroEl = $state<HTMLElement | null>(null);
let numberEl = $state<HTMLElement | null>(null);

const LAND_SCALE = 2.1;
const SETTLE_MS = 420;

// The offsets that put the scaled number's centre on the hero's centre. The
// translate runs before the scale in the number's own units, so the screen
// distance is divided by the scale. Measured at the reveal, when the glyph
// images have their widths.
function aimLanding() {
	if (!heroEl || !numberEl) return;
	const h = heroEl.getBoundingClientRect();
	const n = numberEl.getBoundingClientRect();
	const dx = h.left + h.width / 2 - (n.left + n.width / 2);
	const dy = h.top + h.height / 2 - (n.top + n.height / 2);
	numberEl.style.setProperty("--land-x", `${dx / LAND_SCALE}px`);
	numberEl.style.setProperty("--land-y", `${dy / LAND_SCALE}px`);
}

// Two frames after both are true: when the record lands last, the number mounts
// in that same flush, and a class flipped before its hidden state has painted
// would skip the landing.
$effect(() => {
	if (record === null || !dogStanding) return;
	let raf = requestAnimationFrame(() => {
		raf = requestAnimationFrame(() => {
			aimLanding();
			revealed = true;
		});
	});
	return () => cancelAnimationFrame(raf);
});
$effect(() => {
	if (!revealed) return;
	const settle = setTimeout(() => {
		periodIn = true;
	}, SETTLE_MS);
	return () => clearTimeout(settle);
});
$effect(() => {
	if (!periodIn) return;
	const beat = setTimeout(() => {
		armed = true;
	}, 500);
	return () => clearTimeout(beat);
});

// One string per state until the wording is decided (RT 41 📣).
const STATE_LINES: Record<RatingState, string> = {
	opaque: "Opaque data…",
	partial: "Partial data…",
	open: "Open data…",
	transparent: "Transparent data…",
};
const stateLine = $derived.by(() => {
	const state = record ? ratingState(record.rating) : null;
	return state ? STATE_LINES[state] : "Unscored";
});
</script>

<div class="rating-page" style="--art-sky: url({skyUrl}); --art-pine: url({pineUrl});">
	<section class="rating-hero" bind:this={heroEl}>
		<Greenery ridge>
			<div class="dog-column">
				<DogStage rating={record?.rating ?? null} {armed} {clipRoot} onstanding={() => (dogStanding = true)} />
			</div>
		</Greenery>
		<div class="hero-top">
			<div class="header-sticker" aria-hidden="true">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html HeaderRaw}
			</div>
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
							query={query === record?.name ? "" : query}
							{listLoading}
							{noun}
							listId={LIST_ID}
							{hrefOf}
							within={barEl}
							{clipRoot}
							onpick={pick}
						/>
						{#if notice}
							<p class="search-notice" role="status" aria-live="polite">{notice}</p>
						{/if}
					</div>
					<GlobeSpinIcon class="globe-icon" href={routes.whoMap} />
				</div>
			</div>
		</div>

		<div class="hero-grid">
			<div class="score-column">
				{#if record}
					<h1 class="name">
						<span class="name-text">{record.name};</span>
						<span class="state-line">{stateLine}</span>
					</h1>
					{#if record.rating !== null}
						<div class="number" class:revealed bind:this={numberEl}>
							<RatingNumber rating={record.rating} settled={periodIn} />
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</section>

	<section class="soil-band">
		<div class="yellow-line" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html YellowLineRaw}
		</div>
		<div class="lockup" aria-hidden="true">
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
	</section>

	{#if weedsHref}
		<WeedsSection {tab} href={weedsHref} {clipRoot} {onopenproject} />
	{/if}
</div>

<style>
	.rating-page {
		--pad: clamp(16px, 3vw, 40px);
		position: relative;
		min-height: calc(100vh - 5rem);
		width: 100%;
		background: #0b1109;
		overflow-x: clip;
	}

	/* The foot is the search hero's crest and grass, lower here so the dog and
	   the number stand on the crest; the bottom padding is what keeps them off
	   the grass. Capped at 900px or a tall monitor opens sky between them. */
	.rating-hero {
		--art: min(100vw, 1200px);
		--greenery-h: clamp(170px, calc(var(--art) * 0.3), 36vh);
		--upper-band: calc(var(--greenery-h) * 0.87);
		--stage-w: clamp(200px, 34vw, 480px);
		--stage-h: calc(var(--stage-w) * 900 / 940);
		position: relative;
		width: 100%;
		box-sizing: border-box;
		min-height: min(100vh - 5rem, 900px);
		padding: clamp(20px, 4vh, 48px) var(--pad) calc(var(--greenery-h) * 0.55);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(20px, 4vh, 48px);
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

	/* The comp's top row: the header left, the bar block right, on one line so
	   the score and the dog get the height below. Narrow, the bar drops under. */
	.hero-top {
		position: relative;
		/* Above the hero grid (5): the open list hangs over the name and must take the click. */
		z-index: 7;
		width: 100%;
		max-width: 1180px;
		box-sizing: border-box;
		padding-left: clamp(0px, 6vw, 96px);
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: clamp(12px, 2vh, 24px) clamp(16px, 3vw, 48px);
	}

	/* The search page's block: tabs tucked under the bar's top edge, the bar at
	   the card's width, every size in the bar's own units so they track it. */
	.bar-block {
		--card-max: 576px;
		--bar-scale: calc(min(100vw - 32px, var(--card-max)) / 284.70643);
		position: relative;
		flex: 1 1 320px;
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
		margin-top: auto;
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

	.header-sticker {
		flex: 0 0 auto;
	}

	.header-sticker :global(svg) {
		height: clamp(56px, 8vw, 118px);
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

	/* In the DOM from the moment the record lands, shown once the dog stands:
	   hidden keeps the layout, so the reveal lands without a shift. */
	.number {
		opacity: 0;
		visibility: hidden;
		transform-origin: center;
		transition:
			opacity 260ms ease-out,
			visibility 0s linear 260ms;
	}

	.number.revealed {
		opacity: 1;
		visibility: visible;
		transition-delay: 0s;
	}

	/* Lands at twice its size over the hero's centre and settles into place;
	   the offsets are set inline at the reveal. Reduced motion keeps the fade. */
	@media (prefers-reduced-motion: no-preference) {
		.number.revealed {
			animation: land 420ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
	}

	@keyframes land {
		from {
			opacity: 0;
			transform: scale(2.1) translate(var(--land-x, 0px), var(--land-y, 0px));
		}
		28.6% {
			opacity: 1;
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	/* No script, no dog: a crawler or a reader without JS gets the number as the HTML carries it. */
	@media (scripting: none) {
		.number {
			opacity: 1;
			visibility: visible;
			transform: none;
		}
	}

	/* The dog sits in the grass band, between its green wash and the tufts, so
	   the paws and the planted sapling stand in the grass. Its paws are 65.5%
	   down the stage; they land 72% down the band. */
	.dog-column {
		position: absolute;
		right: clamp(12px, 8vw, 140px);
		bottom: calc(var(--upper-band) * 0.72 - var(--stage-h) * 0.655);
		width: var(--stage-w);
		z-index: 2;
	}

	.soil-band {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: clamp(18px, 3vh, 36px) var(--pad);
		background: #0b1109;
	}

	.lockup {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
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
		--lockup-h: clamp(30px, 5.5vw, 78px);
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
		top: 0;
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

	/* One column: the number sits above the dog's head, which rises over the crest. */
	@media (max-width: 720px) {
		.rating-hero {
			padding-bottom: calc(var(--upper-band) * 0.72 + var(--stage-h) * 0.61 + 12px);
		}
	}
</style>
