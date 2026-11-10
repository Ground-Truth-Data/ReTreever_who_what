<script lang="ts">
import OrgsSelectedRaw from "../assets/svg/search/Search_page_Orgs_Selected.svg?raw";
import OrgsUnselectedRaw from "../assets/svg/search/Search_page_Orgs_Unselected.svg?raw";
import ProjectsSelectedRaw from "../assets/svg/search/Search_page_Projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "../assets/svg/search/Search_page_Projects_Unselected.svg?raw";
import GrassMascot from "./GrassMascot.svelte";
import Greenery from "../stage/Greenery.svelte";
import GlobeSpinIcon from "../stage/GlobeSpinIcon.svelte";
import SearchBar from "./SearchBar.svelte";
import SearchDropdown from "./SearchDropdown.svelte";
import dogUrl from "$rt/assets/ReTreever_logo_sm.webp";
import MiddleDividerRaw from "../assets/svg/search/poly/Search_page_Middle_Divider.svg?raw";
import { m } from "$parent/src/lib/paraglide/messages";
import { localizeHref } from "$parent/src/lib/paraglide/runtime";
import { svgWords } from "./svgWords";

import skyUrl from "../assets/golden_sky_background.webp";
import hillFillWebp from "../assets/pub-Rtvr/home/hill_fill.webp";
import hillFillAvif from "../assets/pub-Rtvr/home/hill_fill.avif";
import hillFillPhone from "../assets/pub-Rtvr/home/hill_fill-1290.avif";
import {
	HEADLINE,
	HOME,
	depthOf,
	layoutPage,
	parallaxY,
	type Placed,
} from "../stage/shardLayout";
import { shard, shardId } from "../stage/shardIndex";
import { withLocalPhotos, withPhonePhotos } from "../stage/svgPhotos";
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
const noun = $derived(activeTab === "orgs" ? m.ww_search_noun_orgs() : m.ww_search_noun_projects());
const placeholder = $derived(activeTab === "orgs" ? m.ww_search_placeholder_orgs() : m.ww_search_placeholder_projects());
const searchLabel = $derived(activeTab === "orgs" ? m.ww_search_label_orgs() : m.ww_search_label_projects());

const localized = (href: string | undefined) => (href ? localizeHref(href) : undefined);

const LIST_ID = "home-search-list";
let list = $state<SearchDropdown | null>(null);
const litTab = $derived(activeTab === "orgs" ? 0 : 1);
const orgsArt = $derived(svgWords(litTab === 0 ? OrgsSelectedRaw : OrgsUnselectedRaw, [["Organizations", m.ww_search_tab_orgs()]]));
const projectsArt = $derived(svgWords(litTab === 1 ? ProjectsSelectedRaw : ProjectsUnselectedRaw, [["Projects", m.ww_search_tab_projects()]]));
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
	localized(activeTab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key));

function pick(item: SearchListItem, go: boolean) {
	if (go) selectItem(item);
	onpick?.(item, activeTab, go);
}

let searchWrapEl = $state<HTMLElement | null>(null);

const PHOTOS = import.meta.glob<string>(
	"../assets/pub-Rtvr/home/poly/*.webp",
	{ eager: true, query: "?url", import: "default" },
);
const PHONE_PHOTOS = import.meta.glob<string>(
	"../assets/pub-Rtvr/home/poly/*-phone.webp",
	{ eager: true, query: "?url", import: "default" },
);
const localPhotos = (svg: string) => withLocalPhotos(svg, PHOTOS, "home/poly");
// Picked once, at mount: the shards lay out from DOM measurements, so none
// renders on the server and the pick costs no second fetch.
const phone = typeof matchMedia === "function" && matchMedia("(max-width: 480px)").matches;
const shardPhotos = (svg: string) =>
	localPhotos(phone ? withPhonePhotos(svg, PHONE_PHOTOS, "home/poly") : svg);

const shardArt: Record<number, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>("../assets/svg/search/poly/Search_page_SP_poly_*.svg", {
			eager: true,
			query: "?raw",
			import: "default",
		}),
	).map(([path, svg]) => [Number(/poly_(\d+)\.svg$/.exec(path)![1]), shardPhotos(svg)]),
);

// The SVG files name their clip by photo number; renamed to the layout id so the inspector shows one number.
const artFor = (n: number) => {
	const art = shard(n).art!;
	return shardArt[art]
		.replaceAll(`search_shard-${art}-clip`, `search_shard-${n}-clip`)
		.replace("<svg ", `<svg id="search_shard-${n}-svg" `);
};

let shards = $state<Placed[]>([]);
let headlineShards = $state<Placed[]>([]);
let heroEl = $state<HTMLElement | null>(null);
let headlineEl = $state<HTMLElement | null>(null);
let cardEl = $state<HTMLElement | null>(null);
let lockupEl = $state<HTMLElement | null>(null);

let scrolled = $state(0);

// One depth reference across BOTH sections, or the headline ring's widest shard
// drifts like a foreground piece while sitting behind one.
const widestShard = $derived(
	Math.max(
		1,
		...shards.map((p) => p.w),
		...headlineShards.map((p) => p.w),
	),
);


let headlineOffset = $state(0);

const headlineScrolled = $derived(Math.max(0, scrolled - headlineOffset));

// Resolved here: `{#each shards as shard}` shadows the imported shard() below.
const dividerId = shardId(shard(26));

// The fold rule in CSS needs the hero's page offset, which only the DOM knows.
let lastHeroTop = -1;
function measure() {
	if (heroEl && headlineEl && cardEl && lockupEl) {
		const vw = heroEl.clientWidth;
		const heroH = heroEl.clientHeight;
		const headH = headlineEl.clientHeight;
		if (vw > 0 && heroH > 0 && headH > 0) {
			// Plus the sections' 16px side padding, so the gutter lane is the bare strip
			// outside the content and a phone shows no sliver beside the card.
			[shards, headlineShards] = layoutPage(vw, [
				{ height: heroH, clearW: cardEl.clientWidth + 32, specs: HOME },
				{ height: headH, clearW: lockupEl.clientWidth + 32, specs: HEADLINE },
			]);
		}
	}
	if (heroEl) {
		const top = Math.round(heroEl.getBoundingClientRect().top + window.scrollY);
		if (top !== lastHeroTop) {
			lastHeroTop = top;
			heroEl.style.setProperty("--hero-top", `${top}px`);
		}
	}
	if (headlineEl) {
		const top = headlineEl.getBoundingClientRect().top + window.scrollY;
		headlineOffset = Math.max(0, top - window.innerHeight);
	}
}

$effect(() => {
	if (!heroEl && !headlineEl) return;
	measure();
	// One solve per frame: a synchronous callback could feed itself via heroEl.
	let raf = 0;
	const schedule = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			measure();
		});
	};
	const ro = new ResizeObserver(schedule);
	if (heroEl) ro.observe(heroEl);
	if (headlineEl) ro.observe(headlineEl);
	window.addEventListener("resize", schedule);

	return () => {
		if (raf) cancelAnimationFrame(raf);
		ro.disconnect();
		window.removeEventListener("resize", schedule);
	};
});

// Own effect: the layout effect re-runs on every solve and would tear the
// scroll listener down each time. Not gated on prefers-reduced-motion — Chris
// runs Reduce Motion on and would never see it.
$effect(() => {
	let ticking = false;
	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			scrolled = window.scrollY;
			ticking = false;
		});
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	scrolled = window.scrollY;

	return () => window.removeEventListener("scroll", onScroll);
});
</script>

{#snippet polyShard(p: Placed, scroll: number)}
	{@const depth = depthOf(p, widestShard)}
	<div
		id={shardId(shard(p.id))}
		class="bg-poly"
		aria-hidden="true"
		style:left="{p.x}px"
		style:top="{p.y}px"
		style:width="{p.w}px"
		style:--depth={depth}
		style:transform="translateY({parallaxY(depth, scroll)}px) rotate({p.rot ?? 0}deg)"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html artFor(p.id)}
	</div>
{/snippet}

<!-- Missing asset falls through to --rtvr-missing-art. -->
<div class="home-search-page" style="--art-sky: url({skyUrl}); --art-hill-fill-webp: url({hillFillWebp}); --art-hill-fill-avif: url({hillFillAvif}); --art-hill-fill-phone: url({hillFillPhone});">
	<section class="hero-section" bind:this={heroEl}>
		{#each shards as shard (shard.id)}
			{@render polyShard(shard, scrolled)}
		{/each}

		<Greenery>
			<GrassMascot ground="grass" />
		</Greenery>

		<div class="search-card" bind:this={cardEl}>
			<nav class="tabs" aria-label={m.ww_search_tabs_label()}>
				<a
					href={localized(routes.who) ?? null}
					class="tab-sticker"
					aria-current={litTab === 0 ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html orgsArt}
				</a>
				<a
					href={localized(routes.what) ?? null}
					class="tab-sticker"
					aria-current={litTab === 1 ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html projectsArt}
				</a>
			</nav>

			<div class="search-bar-wrap" bind:this={searchWrapEl}>
				<SearchBar
					bind:value={query}
					bind:dropdownOpen
					{placeholder}
					ariaLabel={searchLabel}
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
				<p class="slogan slogan-know">
					<span class="ribbon ribbon-a">{m.ww_search_slogan_know()}</span>
					<span class="ribbon ribbon-b">{m.ww_search_slogan_whos_who()}</span>
					<span class="ribbon ribbon-c"><small>{m.ww_search_slogan_in()}</small><span>{m.ww_search_slogan_restoration()}<span class="gold">.</span></span></span>
				</p>
				<GlobeSpinIcon class="globe-icon" href={localized(mapHref ?? routes.whoMap)} />
			</div>
		</div>
	</section>

	<div class="middle-divider" id={dividerId}>
		<div class="middle-divider-photo" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html localPhotos(MiddleDividerRaw)}
		</div>
	</div>

	<section class="headline-section" bind:this={headlineEl}>
		<div class="headline-greenery" aria-hidden="true"></div>

		{#each headlineShards as shard (shard.id)}
			{@render polyShard(shard, headlineScrolled)}
		{/each}

		<div class="headline" bind:this={lockupEl}>
			<h1 class="slogan slogan-counts">
				<span class="ribbon ribbon-name"><img src={dogUrl} alt="" /><span>Re<span class="gold">Tree</span>ver</span></span>
				<span class="ribbon ribbon-counts"><span>{m.ww_search_slogan_counts()}<span class="gold blink">.</span></span></span>
			</h1>
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

	/* Position/width are inline from shardLayout.ts; transform carries ONLY
	   parallax and rotation, so left/top always equal the config. */
	.bg-poly {
		position: absolute;
		pointer-events: none;
		color: var(--color-gold-shard);
		/* Above the hill (0), under the grass (3), whatever the shard's size. */
		z-index: 1;
		will-change: transform;
	}

	/* Three shadows from one light source up-left; keep alphas ASCENDING outward
	   and the near blur ≥ 6px, or a crisp near shadow reads as a black outline. */
	.bg-poly :global(svg) {
		--lift: calc(0.55 + (var(--depth, 0.5) * 0.75));
		width: 100%;
		height: auto;
		display: block;
		filter:
			drop-shadow(
				calc(2px * var(--lift)) calc(3px * var(--lift))
				calc(7px * var(--lift)) rgb(12 8 1 / 0.22)
			)
			drop-shadow(
				calc(7px * var(--lift)) calc(10px * var(--lift))
				calc(16px * var(--lift)) rgb(12 8 1 / 0.34)
			)
			drop-shadow(
				calc(18px * var(--lift)) calc(24px * var(--lift))
				calc(40px * var(--lift)) rgb(12 8 1 / 0.46)
			);
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

	.caption-row :global(.globe-icon) {
		width: calc(74 * var(--bar-scale));
		flex-shrink: 0;
		filter:
			drop-shadow(1px 2px 1px rgb(12 8 1 / 0.7))
			drop-shadow(3px 5px 6px rgb(12 8 1 / 0.5))
			drop-shadow(9px 12px 18px rgb(12 8 1 / 0.38));
	}

	/* Torn-tape ribbons. */
	.slogan {
		position: relative;
		z-index: 4;
		margin: 16px 0 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-family: var(--rt-font-web);
		line-height: 1;
		color: #fff;
		filter: drop-shadow(0 6px 8px rgb(40 25 0 / 0.35));
	}

	.ribbon {
		display: inline-flex;
		align-items: center;
		background: #0e0e0e;
		white-space: nowrap;
	}

	.gold {
		color: #f2c14e;
	}

	.ribbon-a {
		padding: 0.15em 0.65em 0.25em 0.5em;
		font-size: clamp(26px, 2.8vw, 40px);
		font-weight: 600;
		clip-path: polygon(0 10%, 96% 0, 100% 86%, 4% 100%);
		transform: rotate(-2deg);
	}

	.ribbon-b {
		margin: -4px 0 0 1.75em;
		padding: 0.17em 0.66em 0.25em 0.55em;
		font-size: clamp(24px, 2.5vw, 36px);
		font-weight: 700;
		background: #f2c14e;
		color: #0e0e0e;
		clip-path: polygon(3% 0, 100% 12%, 97% 100%, 0 90%);
		transform: rotate(1.5deg);
	}

	.ribbon-c {
		gap: 0.25em;
		margin: -2px 0 0 0.5em;
		padding: 0.2em 0.76em 0.3em 0.65em;
		font-size: clamp(22px, 2.4vw, 34px);
		font-weight: 500;
		clip-path: polygon(0 4%, 100% 0, 97% 100%, 5% 92%);
		transform: rotate(-1deg);
	}

	.ribbon-c small {
		font-size: 0.7em;
	}

	.slogan-counts {
		font-size: clamp(44px, 6.7vw, 96px);
		font-weight: 600;
		filter: drop-shadow(0 8px 12px rgb(0 0 0 / 0.5));
	}

	.ribbon-name {
		gap: 0.15em;
		padding: 0.12em 0.4em 0.19em 0.25em;
		clip-path: polygon(0 6%, 97% 0, 100% 92%, 3% 100%);
		transform: rotate(-2.5deg);
	}

	.ribbon-name img {
		height: 1em;
		width: auto;
	}

	.ribbon-counts {
		margin: -0.1em 0 0 2.6em;
		padding: 0.1em 0.38em 0.17em 0.3em;
		clip-path: polygon(4% 0, 100% 10%, 95% 100%, 0 88%);
		transform: rotate(2deg);
	}

	.blink {
		animation: slogan-blink 1.1s infinite;
	}

	@keyframes slogan-blink {
		0%, 55% { opacity: 1; }
		56%, 100% { opacity: 0; }
	}

	/* Slogan and globe side by side, centred as a pair; under the globe once narrow. */
	.slogan-know {
		margin: 0;
	}

	@media (max-width: 999px) {
		.caption-row {
			flex-direction: column;
		}

		.slogan-know {
			order: 1;
		}
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
		z-index: 5;
	}

	@media (max-width: 640px) {
		.caption-row {
			gap: 10px;
		}
	}

	/* A phone gets art sized for 430px at 3x; old Safari keeps the plain WebP line above. */
	@media (max-width: 480px) {
		.headline-greenery {
			background-image: image-set(
				var(--art-hill-fill-phone, var(--rtvr-missing-art)) type("image/avif"),
				var(--art-hill-fill-webp, var(--rtvr-missing-art)) type("image/webp")
			);
		}
	}

	/* Taps: the art keeps its size, the hit box grows. Room above a tab lifts
	   its centre clear of the bar it tucks under. */
	@media (max-width: 767px) {
		.tab-sticker {
			--reach: max(0px, calc(60px - var(--tab-h-idle)));
			box-sizing: content-box;
			padding-top: var(--reach);
			margin-top: calc(-1 * var(--reach));
		}

		.tab-sticker[aria-current="page"] {
			--reach: max(0px, calc(60px - var(--tab-h-active)));
		}
	}

	/* 550px is the Get Cache breakpoint, where the bar spans the screen. */
	@media (max-width: 550px) {
		.caption-row :global(.globe-icon) {
			width: max(40px, calc(44.5 * var(--bar-scale)));
		}
	}
</style>
