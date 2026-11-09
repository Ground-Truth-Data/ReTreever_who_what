<script lang="ts">
import HeaderRaw from "../assets/svg/rating/Rating_page_Data_transparency_rating_header.svg?raw";
import OrgsSelectedRaw from "../assets/svg/rating/Rating_page_orgs_selected.svg?raw";
import OrgsUnselectedRaw from "../assets/svg/rating/Rating_page_orgs_unselected.svg?raw";
import ProjectsSelectedRaw from "../assets/svg/rating/Rating_page_projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "../assets/svg/rating/Rating_page_projects_unselected.svg?raw";
import TruthIsInRaw from "../assets/svg/rating/Rating_page_Truth_is_in.svg?raw";
import TheWeedsRaw from "../assets/svg/rating/Rating_page_the_weeds_dot_dot_dot.svg?raw";
import DigRaw from "../assets/svg/rating/Rating_page_Dig.svg?raw";
import InRaw from "../assets/svg/rating/Rating_page_in.svg?raw";
import DeeperRaw from "../assets/svg/rating/Rating_page_deeper_period.svg?raw";
import shovelUrl from "../assets/pub-Rtvr/rating/shovel-highballer.webp";
import YellowLineRaw from "../assets/svg/rating/Rating_page_bottom_yellow_line.svg?raw";
import groundUrl from "../assets/pub-Rtvr/rating/ground.webp";
import skyUrl from "../assets/golden_sky_background.webp";
import pineUrl from "../assets/pub-Rtvr/rating/poly/rp-pine.webp";
import pinePhoneUrl from "../assets/pub-Rtvr/rating/poly/rp-pine-1366.webp";
import DogStage from "./DogStage.svelte";
import LessonHand from "../stage/LessonHand.svelte";
import HelpSticker from "../stage/HelpSticker.svelte";
import NumberFollower from "./NumberFollower.svelte";
import GlobeSpinIcon from "../stage/GlobeSpinIcon.svelte";
import Greenery from "../stage/Greenery.svelte";
import RatingNumber from "./RatingNumber.svelte";
import TreesPlanted from "./TreesPlanted.svelte";
import SearchBar from "../search/SearchBar.svelte";
import SearchDropdown from "../search/SearchDropdown.svelte";
import WeedsSection from "../weeds/WeedsSection.svelte";
import WeedsTally from "../weeds/WeedsTally.svelte";
import type { SearchResult } from "./resultLoad";
import type { SearchListItem } from "../search/searchTypes";
import { ratingState, type RatingState } from "./ratingState";
import { WEEDS_TABLES, type ScoreTally, type WeedsTable, type WhoWhatRoutes } from "../whoWhatTypes";
import { svgWords } from "../search/svgWords";
import { svgFit } from "../stage/svgFit";
import { m } from "$parent/src/lib/paraglide/messages";
import { localizeHref } from "$parent/src/lib/paraglide/runtime";

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
	onwords,
	weedsHref = undefined,
	tally = null,
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
	/** The words the list should narrow to: empty while the bar still shows the record's own name. */
	onwords?: (words: string) => void;
	/** The host's URL for one weeds table of this record; absent, no weeds. */
	weedsHref?: (table: WeedsTable) => string;
	/** How the score adds up; null until the host answers, or when it cannot. */
	tally?: ScoreTally | null;
	onopenproject?: (projectKey: string) => void;
} = $props();

// The tally reads the lit tab from the weeds and shows only while the reader
// is in the weeds: from the moment "Truth is in the weeds" pins under the nav
// until the track's end rises above the viewport's middle. Any earlier and it
// floats over the hills. The observer gates the scroll work.
let litIndex = $state(0);
let tallyVisible = $state(false);
let undergroundEl = $state<HTMLElement | null>(null);
$effect(() => {
	const el = undergroundEl;
	if (!el) return;
	let intersecting = false;
	let raf = 0;
	const read = () => {
		raf = 0;
		if (!intersecting) {
			tallyVisible = false;
			return;
		}
		const pin = weeds?.stagePin() ?? null;
		tallyVisible = pin !== null && window.scrollY >= pin - 1 && el.getBoundingClientRect().bottom >= window.innerHeight / 2;
	};
	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(read);
	};
	const io = new IntersectionObserver(
		(entries) => {
			intersecting = entries[entries.length - 1].isIntersecting;
			onScroll();
		},
		{ threshold: [0, 0.25] },
	);
	io.observe(el);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll);
	return () => {
		io.disconnect();
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("resize", onScroll);
		if (raf) cancelAnimationFrame(raf);
	};
});

// The follower rides in a track laid over the page from its top to just
// above the lockup, so sticky pins it under the nav and the browser lets it
// go before "Truth is in the weeds" arrives: the lockup and the tally take
// over. The track's height is the one measured thing; the follower shows
// once the real number has gone under the nav, and turns light once its own
// top is past the crest of the hills, which is where the dark begins.
let pageEl = $state<HTMLElement | null>(null);
let following = $state(false);
let overSoil = $state(false);
$effect(() => {
	const page = pageEl;
	const soil = undergroundEl;
	const number = numberEl;
	const shown = revealed;
	if (!page || !soil) return;
	let raf = 0;
	let lastHead = -1;
	const navBottom = () => {
		const root = getComputedStyle(document.documentElement);
		const chrome = parseFloat(root.getPropertyValue("--host-chrome"));
		return Number.isFinite(chrome) ? chrome : 5 * parseFloat(root.fontSize);
	};
	// The lockup pins with the weeds, so its unpinned top is read off the soil it opens.
	const bandTop = () => soil.getBoundingClientRect().top + parseFloat(getComputedStyle(soil).paddingTop);
	const read = () => {
		raf = 0;
		const body = page.querySelector(".follower .body")?.getBoundingClientRect().height ?? 0;
		const head = bandTop() - page.getBoundingClientRect().top - body;
		if (Math.abs(head - lastHead) >= 1) {
			lastHead = head;
			page.style.setProperty("--dig-head-h", `${Math.round(head)}px`);
		}
		const nav = navBottom();
		following = shown && number !== null && number.getBoundingClientRect().bottom <= nav;
		const followerTop = Math.min(nav + 12, bandTop() - body);
		const dark = page.querySelector(".crest") ?? soil;
		overSoil = followerTop >= dark.getBoundingClientRect().top;
	};
	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(read);
	};
	onScroll();
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll);
	return () => {
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("resize", onScroll);
		if (raf) cancelAnimationFrame(raf);
	};
});

const noun = $derived(tab === "orgs" ? m.ww_search_noun_orgs() : m.ww_search_noun_projects());
const LIST_ID = "rating-search-list";
let dropdownOpen = $state(false);
let list = $state<SearchDropdown | null>(null);
let activeDescendant = $state<string | undefined>(undefined);
let barEl = $state<HTMLElement | null>(null);

const localized = (href: string | undefined) => (href ? localizeHref(href) : undefined);

const hrefOf = (item: SearchListItem) =>
	localized(tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key));

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
const words = $derived(query === record?.name ? "" : query);
$effect(() => onwords?.(words));

// The number waits for the dog to stand, then the dog brings it: it is born
// small at the dog's mouth, lobs across to its place growing to full size, and
// its period lands; the dog turns half a beat after that.
let dogStanding = $state(false);
let armed = $state(false);
let revealed = $state(false);
let periodIn = $state(false);
let heroEl = $state<HTMLElement | null>(null);
let numberEl = $state<HTMLElement | null>(null);

// The mouth of the dog watching in profile, as a fraction of the dog stage: where the lob starts.
const MOUTH_X = 0.18;
const MOUTH_Y = 0.48;

// The screen offset from the number's centre to the dog's mouth, or to the
// hero's centre when there is no dog on stage. Measured at the reveal, when
// the glyph images have their widths; the lob keyframe reads it.
function aimLanding() {
	if (!numberEl) return;
	const stage = pageEl?.querySelector<HTMLElement>(".dog-stage");
	const from = stage ?? heroEl;
	if (!from) return;
	const f = from.getBoundingClientRect();
	const fx = f.left + f.width * (stage ? MOUTH_X : 0.5);
	const fy = f.top + f.height * (stage ? MOUTH_Y : 0.5);
	const n = numberEl.getBoundingClientRect();
	numberEl.style.setProperty("--lob-x", `${fx - (n.left + n.width / 2)}px`);
	numberEl.style.setProperty("--lob-y", `${fy - (n.top + n.height / 2)}px`);
}

// The period lands when the lob has: the keyframe's duration, which reduced
// motion sets to zero.
function lobMs(): number {
	if (!numberEl) return 0;
	const d = getComputedStyle(numberEl).animationDuration;
	return d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000;
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
	}, lobMs() || 260);
	return () => clearTimeout(settle);
});
$effect(() => {
	if (!periodIn) return;
	const beat = setTimeout(() => {
		armed = true;
	}, 200);
	return () => clearTimeout(beat);
});

let dog = $state<DogStage | null>(null);
let weeds = $state<WeedsSection | null>(null);
let lessonHand = $state<LessonHand | null>(null);
const lessonPlaying = $derived(lessonHand?.playing() ?? false);
const pressHelp = () => (lessonPlaying ? lessonHand?.cancel() : void lessonHand?.play());
const lessonDoors = {
	scored: () => record?.rating !== null,
	number: () => numberEl,
	dog: () => pageEl?.querySelector<HTMLElement>(".dog-stage") ?? null,
	nudge: () => dog?.nudge(),
	weedsPin: () => weeds?.stagePin() ?? null,
	litTable: () => weeds?.litTable() ?? WEEDS_TABLES[0],
	tab: (t: WeedsTable) => document.getElementById(`weeds-tab-${t}`),
	lessonPick: (t: WeedsTable) => weeds?.lessonPick(t) ?? Promise.resolve(),
	tally: () => pageEl?.querySelector<HTMLElement>(innerWidth >= 1100 ? ".tally.corner .big" : ".tally.strip .pct") ?? null,
};
const lessonFacts = () => ({
	focusWithin: !!barEl?.contains(document.activeElement) || !!pageEl?.querySelector(".weeds-bar")?.contains(document.activeElement),
	dropdownOpen,
	pageReady: record !== null && dogStanding && (record.rating === null || revealed),
});

// One string per state until the wording is decided (RT 41 📣).
const STATE_LINES: Record<RatingState, () => string> = {
	opaque: m.ww_rating_state_opaque,
	partial: m.ww_rating_state_partial,
	open: m.ww_rating_state_open,
	transparent: m.ww_rating_state_transparent,
};
const stateLine = $derived.by(() => {
	const state = record ? ratingState(record.rating) : null;
	return state ? STATE_LINES[state]() : m.ww_rating_state_unscored();
});

const headerArt = svgFit(HeaderRaw, [
	["RATING:", m.ww_rating_art_rating()],
	["Data Transparency", m.ww_rating_art_data_transparency()],
]);
const orgsArt = $derived(svgWords(tab === "orgs" ? OrgsSelectedRaw : OrgsUnselectedRaw, [["Organizations", m.ww_search_tab_orgs()]]));
const projectsArt = $derived(svgWords(tab === "projects" ? ProjectsSelectedRaw : ProjectsUnselectedRaw, [["Projects", m.ww_search_tab_projects()]]));
const truthArt = svgFit(TruthIsInRaw, [
	["Truth", m.ww_rating_art_truth()],
	["is in", m.ww_rating_art_is_in()],
]);
const weedsArt = svgFit(TheWeedsRaw, [
	["the", m.ww_rating_art_the()],
	["weeds", m.ww_rating_art_weeds()],
]);
const digArt = svgFit(DigRaw, [["Dig", m.ww_rating_art_dig()]]);
const inArt = svgFit(InRaw, [["in", m.ww_rating_art_in()]]);
const deeperArt = svgFit(DeeperRaw, [["deeper", m.ww_rating_art_deeper()]]);
</script>

<div class="rating-page" style="--art-sky: url({skyUrl}); --art-pine: url({pineUrl}); --art-pine-phone: url({pinePhoneUrl}); --art-ground: url({groundUrl});" bind:this={pageEl}>
	{#if record && record.rating !== null}
		<div class="dig-head">
			<NumberFollower rating={record.rating} name={record.name} {stateLine} on={following} {overSoil} {numberEl} />
		</div>
	{/if}
	<section class="rating-hero" bind:this={heroEl}>
		<Greenery>
			<div class="dog-column">
				<DogStage bind:this={dog} rating={record?.rating ?? null} {armed} {clipRoot} onstanding={() => (dogStanding = true)} />
			</div>
		</Greenery>
		<div class="hero-top">
			<div class="header-sticker" aria-hidden="true">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html headerArt}
			</div>
			<div class="bar-block">
				<nav class="tabs" aria-label={m.ww_search_tabs_label()}>
					<a href={localized(routes.who) ?? null} class="tab-sticker" aria-current={tab === "orgs" ? "page" : undefined}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html orgsArt}
					</a>
					<a href={localized(routes.what) ?? null} class="tab-sticker" aria-current={tab === "projects" ? "page" : undefined}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html projectsArt}
					</a>
				</nav>
				<div class="bar-row">
					<div class="bar" bind:this={barEl}>
						<SearchBar
							bind:value={query}
							bind:dropdownOpen
							id="rating-search"
							placeholder={tab === "orgs" ? m.ww_search_placeholder_orgs() : m.ww_search_placeholder_projects()}
							ariaLabel={tab === "orgs" ? m.ww_search_label_orgs() : m.ww_search_label_projects()}
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
							query={words}
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
					<GlobeSpinIcon class="globe-icon" href={localized(routes.whoMap)} />
					<HelpSticker playing={lessonPlaying} onpress={pressHelp} />
				</div>
			</div>
		</div>

		<div class="hero-grid">
			<div class="score-column" class:pending={!record}>
				{#if record}
					<h1 class="name">
						<span class="name-text">{m.ww_rating_name_line({ name: record.name })}</span>
						<span class="state-line">{stateLine}</span>
					</h1>
					{#if record.rating !== null}
						<div class="number" class:revealed bind:this={numberEl}>
							<RatingNumber rating={record.rating} settled={periodIn} />
						</div>
					{/if}
					<TreesPlanted value={tally?.planted} {revealed} />
				{/if}
			</div>
		</div>
	</section>

	<div class="underground" class:has-tally={tally !== null} bind:this={undergroundEl}>
	{#snippet lockup()}
	<section class="soil-band">
		<div class="lockup" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="sticker truth">{@html truthArt}</div>
			<img class="shovel" src={shovelUrl} alt="" draggable="false" />
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="sticker weeds">{@html weedsArt}</div>
			<div class="yellow-line">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html YellowLineRaw}
			</div>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="sticker dig">{@html digArt}</div>
			<div class="tail">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker in">{@html inArt}</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="sticker deeper">{@html deeperArt}</div>
			</div>
		</div>
		<p class="visually-hidden">{m.ww_rating_lockup()}</p>
	</section>
	{/snippet}

	{#if weedsHref}
		<WeedsSection bind:this={weeds} {tab} href={weedsHref} head={lockup} {clipRoot} {onopenproject} onactive={(i) => (litIndex = i)} />
		{#if tally}
			<WeedsTally {tally} {litIndex} visible={tallyVisible} />
		{/if}
	{:else}
		{@render lockup()}
	{/if}
	</div>
	<LessonHand bind:this={lessonHand} name="rating" facts={lessonFacts} rating={lessonDoors} />
</div>

<style>
	.rating-page {
		--pad: clamp(16px, 3vw, 40px);
		--art: min(100vw, 1200px);
		--greenery-h: clamp(170px, calc(var(--art) * 0.3), 36vh);
		--upper-band: calc(var(--greenery-h) * 0.87);
		/* The soil runs this far up under the grass, and the grass bases fade into it. */
		--soil-overlap: calc(var(--upper-band) * 0.22);
		position: relative;
		min-height: calc(100vh - 5rem);
		width: 100%;
		background: #0b1109;
		overflow-x: clip;
	}

	/* The follower's track: from the page's top to the lockup's foot, measured
	   on every scroll read. No box of its own. */
	.dig-head {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: var(--dig-head-h, 0px);
		pointer-events: none;
	}

	/* The foot is the search hero's crest and grass, lower here so the dog and
	   the number stand on the crest; the bottom padding is what keeps them off
	   the grass. Capped at 900px or a tall monitor opens sky between them. */
	.rating-hero {
		--stage-w: clamp(200px, 34vw, 480px);
		--stage-h: calc(var(--stage-w) * 900 / 940);
		--dog-lift: calc(var(--soil-overlap) - var(--stage-h) * 20 / 900);
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
		z-index: 1;
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - var(--soil-overlap)), transparent);
		mask-image: linear-gradient(to bottom, #000 calc(100% - var(--soil-overlap)), transparent);
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
		grid-template-columns: minmax(0, 1fr) auto auto;
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

	/* As tall as the globe: its width on the sprite's 213:160 frame. */
	.bar-row :global(.help-sticker) {
		height: calc(30 * var(--bar-scale) * 160 / 213);
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

	/* Born at the dog's mouth at a fraction of its size, it crosses to its place
	   growing to full size while the glyphs hop in an arc on the way; the
	   offsets are set inline at the reveal. Reduced motion keeps the fade. */
	.number {
		--from: var(--lob-from, 0.2);
		--rise: var(--lob-rise, 110px);
		--ms: var(--lob-ms, 600ms);
	}

	@media (prefers-reduced-motion: no-preference) {
		.number.revealed {
			animation: lob var(--ms) cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}

		.number.revealed :global(.rating-number) {
			animation: hop var(--ms) both;
		}
	}

	@keyframes lob {
		from {
			opacity: 0;
			transform: translate(var(--lob-x, 0px), var(--lob-y, 0px)) scale(var(--from));
		}
		12% {
			opacity: 1;
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes hop {
		from {
			transform: translateY(0);
			animation-timing-function: ease-out;
		}
		45% {
			transform: translateY(calc(-1 * var(--rise)));
			animation-timing-function: ease-in;
		}
		to {
			transform: translateY(0);
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

	/* The dog sits in the grass band, between its green wash and the tufts.
	   The stage's foot, where the sapling goes in, is 20 of its 900 rows below
	   the clips' lowest pixel and lands where the grass starts fading into the
	   soil. No z-index: DogStage stacks its layers in the hero's context, the
	   dog under the tufts and the sapling over them. */
	.dog-column {
		position: absolute;
		right: clamp(12px, 8vw, 140px);
		bottom: var(--dog-lift);
		width: var(--stage-w);
	}

	/* The band's own z-index (3) would cap the running dog under the hero's
	   words. Unset, its washes (0, 1) and tufts (3) still stack under them,
	   and the dog can rise over them while it runs. */
	.rating-hero :global(.wildflower-band) {
		z-index: auto;
	}

	/* Below the grass the page is underground: one ground picture, drawn once
	   and never mirrored or repeated, under the lockup and the weeds; a wash
	   of the page's dark keeps the stickers and the tabs legible on it. It is
	   as wide as the page and at least as tall as the pinned scene (a screen,
	   or the pin's 520px floor under the head), so a narrow screen crops its
	   sides. */
	.underground {
		--ground-w: max(100%, calc(max(100dvh, 860px) * 986 / 712));
		position: relative;
		margin-top: calc(var(--soil-overlap) * -1);
		padding-top: var(--soil-overlap);
	}

	/* The weeds pin paints the same ground, shifted by where it starts, so
	   it is seamless until it pins and then holds still while the tabs walk. */
	.underground,
	.underground :global(.weeds-pin) {
		background:
			linear-gradient(rgb(11 17 9 / 0.3), rgb(11 17 9 / 0.3)),
			var(--art-ground) center var(--soil-y, 0px) / var(--ground-w) auto no-repeat,
			#0b1109;
	}

	.underground :global(.weeds-pin) {
		--soil-y: calc(var(--soil-overlap) * -1);
	}

	/* The tally stands in the right margin from 1100px up (WeedsTally's own
	   breakpoint); the weeds track keeps that column free. */
	@media (min-width: 1100px) {
		.underground.has-tally {
			--stage-room: 300px;
		}
	}

	.soil-band {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: clamp(28px, 5vh, 56px) var(--pad) clamp(18px, 3vh, 36px);
	}

	/* Three columns, the shovel alone in the middle one: the words on each
	   row close up to it from either side, so its blade, pushed through the
	   line into the second row, lands in a gap the grid keeps for it and
	   never on a letter, whatever the width or the language. */
	.lockup {
		--lockup-h: clamp(30px, 5.5vw, 78px);
		display: grid;
		grid-template-columns: repeat(3, auto);
		justify-content: center;
		align-items: end;
		column-gap: clamp(6px, 1vw, 14px);
		row-gap: 2px;
	}

	.truth,
	.dig {
		justify-self: end;
	}

	.weeds,
	.tail {
		grid-column: 3;
		justify-self: start;
	}

	.dig,
	.tail {
		grid-row: 3;
	}

	.tail {
		display: flex;
		align-items: flex-end;
		gap: clamp(6px, 1vw, 14px);
	}

	.sticker :global(svg) {
		height: var(--lockup-h);
		width: auto;
		display: block;
		filter: drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	/* A real planting shovel, its blade sunk through the line. The yellow
	   rim keeps its dark grip and steel readable on the soil, a sticker
	   like the words around it. */
	.shovel {
		--rim: clamp(1px, 0.15vw, 2px);
		position: relative;
		z-index: 1;
		grid-area: 1 / 2;
		display: block;
		height: calc(var(--lockup-h) * 1.9);
		width: auto;
		margin-bottom: calc(var(--lockup-h) * -0.55);
		pointer-events: none;
		filter:
			drop-shadow(var(--rim) 0 0 var(--rt-yellow-bright))
			drop-shadow(calc(-1 * var(--rim)) 0 0 var(--rt-yellow-bright))
			drop-shadow(0 var(--rim) 0 var(--rt-yellow-bright))
			drop-shadow(0 calc(-1 * var(--rim)) 0 var(--rt-yellow-bright))
			drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	/* Full-bleed between the two rows, as the reference draws it. The item
	   itself is zero wide so the line never widens the grid's columns; its
	   art overflows from the centre to both edges. */
	.yellow-line {
		position: relative;
		grid-area: 2 / 1 / 3 / 4;
		justify-self: center;
		width: 0;
	}

	.yellow-line :global(svg) {
		width: 100vw;
		margin-left: -50vw;
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

	/* At 5% opacity the faint pine needs no more than a 1x tile on a phone. */
	@media (max-width: 767px) {
		.rating-hero::before {
			background-image: var(--art-pine-phone, var(--art-pine));
		}
	}

	/* One column: the hero hugs its content, since a phone's 100vh is taller
	   than what a reader sees. The padding is the stage's top plus a quarter
	   stage; the -64px raises the dog's head behind the crest to just under
	   the number's foot (the grid stacks over the dog); any more and it
	   reaches the number. That puts the whole dog on the first screen. */
	@media (max-width: 720px) {
		.rating-hero {
			min-height: 0;
			padding-bottom: calc(var(--dog-lift) + var(--stage-h) * 1.265 - 64px);
		}

		/* Held while the record streams: a one-line name (49px), the row gap and
		   the number (102px) with its margins, so the dog stands where it will. */
		.score-column.pending {
			min-height: calc(155px + 2 * clamp(4px, 1vh, 12px));
		}
	}

	/* A phone: the header shares its row with the globe and the help sticker,
	   so the bar spans the screen at the search page's size; the number stands
	   beside its trees-planted box, which brings the dog onto the first screen. */
	@media (max-width: 720px) {
		.rating-hero {
			padding-top: 16px;
			gap: 10px;
		}

		.hero-top {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto auto;
			grid-template-areas:
				"head globe help"
				"tabs tabs tabs"
				"bar bar bar";
			align-items: center;
			gap: 0 10px;
			padding-left: 0;
		}

		.bar-block,
		.bar-row {
			display: contents;
		}

		.header-sticker {
			grid-area: head;
		}

		.tabs {
			grid-area: tabs;
			justify-self: start;
			margin-top: 8px;
		}

		.bar {
			grid-area: bar;
			z-index: 1;
			width: 100%;
			max-width: var(--card-max);
		}

		.bar-row :global(.globe-icon) {
			grid-area: globe;
			width: clamp(40px, calc(44.5 * var(--bar-scale)), 64px);
		}

		.bar-row :global(.help-sticker) {
			grid-area: help;
			height: calc(clamp(40px, calc(44.5 * var(--bar-scale)), 64px) * 160 / 213);
		}

		.score-column {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center;
			column-gap: 16px;
			row-gap: 4px;
		}

		.name {
			flex-basis: 100%;
		}
	}

	/* Taps: the art keeps its size, the hit box grows. Room above a tab lifts
	   its centre clear of the bar it tucks under. */
	@media (max-width: 767px) {
		.tab-sticker {
			--reach: max(0px, calc(60px - 22.75 * var(--bar-scale)));
			box-sizing: content-box;
			padding-top: var(--reach);
			margin-top: calc(-1 * var(--reach));
		}

		.tab-sticker[aria-current="page"] {
			--reach: max(0px, calc(60px - 32.6 * var(--bar-scale)));
		}
	}
</style>
