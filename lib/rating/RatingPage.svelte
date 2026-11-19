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
import DogStage from "./DogStage.svelte";
import LessonHand from "../stage/LessonHand.svelte";
import HelpSticker from "../stage/HelpSticker.svelte";
import NumberFollower from "./NumberFollower.svelte";
import GlobeSpinIcon from "../stage/GlobeSpinIcon.svelte";
import RatingNumber from "./RatingNumber.svelte";
import MeasureSticker from "./MeasureSticker.svelte";
import SearchBar from "../search/SearchBar.svelte";
import SearchDropdown from "../search/SearchDropdown.svelte";
import WeedsSection from "../weeds/WeedsSection.svelte";
import WeedsTally from "../weeds/WeedsTally.svelte";
import { placeLine } from "../weeds/tallyMath";
import RatingFeedback from "./RatingFeedback.svelte";
import RatingGround from "./RatingGround.svelte";
import type { SearchResult } from "./resultLoad";
import type { SearchListItem } from "../search/searchTypes";
import { holdPickedName, pickedNameFor } from "./pickedName";
import { ratingState, type RatingState } from "./ratingState";
import { WEEDS_TABLES, formatRatingOutOf, type ScoreTally, type WeedsTable, type WhoWhatRoutes } from "../whoWhatTypes";
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
	feedbackHref = undefined,
	feedbackAddress = undefined,
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
	onopenproject?: (projectKey: string, name?: string) => void;
	/** The host's feedback endpoint; absent, no feedback line. */
	feedbackHref?: string;
	feedbackAddress?: string;
} = $props();

// The tally reads the lit tab from the weeds and shows only while the reader
// is in the weeds: from the moment "Truth is in the weeds" pins under the nav,
// or the hero's number starts down into it, until the track's end rises above
// the viewport's middle. Any earlier and it floats over the hills. The
// observer gates the scroll work.
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
// With motion allowed the number never rides: from the page's top until the
// stage pins it leaves the hero for the ledger's number (the phone strip's
// under 1100px), `land` says how far, and the ledger rises with the stage.
let pageEl = $state<HTMLElement | null>(null);
let following = $state(false);
let overSoil = $state(false);
let land = $state(0);
let travels = $state(false);
const ledgerNumber = () =>
	pageEl?.querySelector<HTMLElement>(innerWidth >= 1100 ? ".tally.corner .big .rating-number" : ".tally.strip .pct .rating-number") ?? null;
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
		const body = page.querySelector<HTMLElement>(".follower .body")?.offsetHeight ?? 0;
		const nav = navBottom();
		const pin = weeds?.stagePin() ?? null;
		travels =
			shown &&
			tally !== null &&
			record?.rating != null &&
			pin !== null &&
			pin > 0 &&
			!matchMedia("(prefers-reduced-motion: reduce)").matches;
		const letGo = bandTop() + window.scrollY - (nav + 12 + body);
		const run = travels && pin !== null ? Math.max(1, pin - letGo) : 0;
		land = travels && pin !== null ? Math.min(1, Math.max(0, window.scrollY / pin)) : 0;
		const head = bandTop() - page.getBoundingClientRect().top - body + run;
		if (Math.abs(head - lastHead) >= 1) {
			lastHead = head;
			page.style.setProperty("--dig-head-h", `${Math.round(head)}px`);
		}
		// The ledger stands under the pinned head, raised only as far as the window's foot needs.
		const ledger = page.querySelector<HTMLElement>(".tally.corner");
		if (ledger) {
			const head = page.querySelector<HTMLElement>(".weeds-head")?.offsetHeight ?? 0;
			const top = Math.max(nav + 12, Math.min(nav + head + 24, window.innerHeight - 16 - ledger.offsetHeight));
			page.style.setProperty("--ledger-top", `${Math.round(top)}px`);
			// Until the stage pins, the ledger stands where it will pin, so it rises into view with the table.
			ledger.style.translate = travels && pin !== null && window.scrollY < pin ? `0 ${Math.round(pin - window.scrollY)}px` : "";
		}
		following = !travels && shown && number !== null && number.getBoundingClientRect().bottom <= nav;
		const followerTop = Math.min(nav + 12, bandTop() - body + run);
		const dark = page.querySelector(".crest") ?? soil;
		overSoil = land > 0 || followerTop >= dark.getBoundingClientRect().top;
	};
	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(read);
	};
	onScroll();
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll);
	// The head compacts on a transition once pinned; a reader who stops scrolling mid-shrink still gets the ledger's final top.
	const headSize = new ResizeObserver(onScroll);
	const headEl = page.querySelector<HTMLElement>(".weeds-head");
	if (headEl) headSize.observe(headEl);
	return () => {
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("resize", onScroll);
		headSize.disconnect();
		if (raf) cancelAnimationFrame(raf);
	};
});

// Read at the press, so the lit tab is the one the reader is looking at.
const feedbackAbout = () => ({
	kind: tab === "orgs" ? ("org" as const) : ("project" as const),
	key: record?.key ?? "",
	name: record?.name ?? "",
	rating: record?.rating ?? null,
	tab: weedsHref ? WEEDS_TABLES[litIndex] : undefined,
});

const noun = $derived(tab === "orgs" ? m.ww_search_noun_orgs() : m.ww_search_noun_projects());
const LIST_ID = "rating-search-list";
let dropdownOpen = $state(false);
let list = $state<SearchDropdown | null>(null);
let activeDescendant = $state<string | undefined>(undefined);
let barEl = $state<HTMLElement | null>(null);

const localized = (href: string | undefined) => (href ? localizeHref(href) : undefined);

// The tally's link: the page that walks this score down to its parts.
const scoreHref = $derived(record ? localized(tab === "orgs" ? routes.whoOrgScore?.(record.key) : routes.whatProjectScore?.(record.key)) : undefined);

// Under the number: the group the rating places it in, so the number is read as a place and not a mark.
const ranked = $derived(tally ? (placeLine(tally)?.ranked ?? null) : null);

const hrefOf = (item: SearchListItem) =>
	localized(tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key));

// The bar carries this record's name once it lands; opened untouched, the list
// offers the most-searched records rather than one match for the page itself.

function submit(q: string) {
	const item = list?.current();
	if (item) {
		query = item.name;
		dropdownOpen = false;
		holdName(item);
		onpick?.(item, true);
		return;
	}
	onsearch?.(q);
}

function pick(item: SearchListItem, go: boolean) {
	if (go) {
		query = item.name;
		dropdownOpen = false;
		holdName(item);
	}
	onpick?.(item, go);
}

function holdName(item: SearchListItem) {
	holdPickedName(hrefOf(item), item.name);
}

// The picked name, while its record streams: the hero holds that name's height.
// svelte-ignore state_referenced_locally
const heldName = record === null && typeof location !== "undefined" ? pickedNameFor(location) : "";

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

// The hero shows no state line; a screen reader hears it with the number.
const STATE_WORDS: Record<RatingState, () => string> = {
	opaque: m.ww_rating_state_opaque,
	partial: m.ww_rating_state_partial,
	open: m.ww_rating_state_open,
	transparent: m.ww_rating_state_transparent,
};
const numberLabel = (rating: number) => {
	const state = ratingState(rating);
	return state ? m.ww_rating_number_label({ score: formatRatingOutOf(rating), state: STATE_WORDS[state]() }) : formatRatingOutOf(rating);
};

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

<RatingGround bind:pageEl bind:heroEl bind:undergroundEl hasTally={tally !== null}>
	{#snippet before()}
	{#if record && record.rating !== null}
		<div class="dig-head">
			<NumberFollower rating={record.rating} name={record.name} on={following} {overSoil} {numberEl} {land} landOn={ledgerNumber} />
		</div>
	{/if}
	{/snippet}
	{#snippet grass()}
			<div class="dog-column">
				<DogStage bind:this={dog} rating={record?.rating ?? null} {armed} {clipRoot} onstanding={() => (dogStanding = true)} />
			</div>
	{/snippet}
	{#snippet hero()}
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
			<div class="score-column">
				{#if record}
					<h1 class="name">
						<span class="name-text">{record.name}</span>
						{#if record.rating === null}
							<span class="unscored">{m.ww_rating_state_unscored()}</span>
						{/if}
					</h1>
					{#if record.rating !== null}
						<div class="number-slot" class:wide={record.rating.toFixed(1).length > 4}>
							<!-- Holds the place while the dog brings the number: zeros, so the score is not told early ("000.0" would be). -->
							<div class="number-ghost" class:gone={revealed} aria-hidden="true">
								<RatingNumber text={record.rating.toFixed(1).length > 3 ? "00.0" : "0.0"} outOf={100} />
							</div>
							<div class="number" class:revealed class:away={land > 0} bind:this={numberEl}>
								<RatingNumber rating={record.rating} settled={periodIn} outOf={100} label={numberLabel(record.rating)} />
							</div>
						</div>
						<!-- Its own line, held from first paint like the measure's slot, so neither a long figure nor the sticker's arrival moves it. -->
						<div class="score-link-row">
							{#if ranked}
								<p class="score-among" class:revealed={periodIn}>{ranked}</p>
							{/if}
						</div>
						<!-- Held from first paint: the measure is a second request, and its arrival must move nothing. -->
						<div class="measure-slot">
							{#if tally?.measure}
								<MeasureSticker measure={tally.measure} {revealed} />
							{/if}
						</div>
					{/if}
				{:else}
					<!-- Holds the record's height while it streams, so the hills and the dog stand where they will: the picked name's lines, or one line when nothing was picked. -->
					<div class="ghost" aria-hidden="true">
						<div class="name"><span class="name-text">{heldName || "\u00a0"}</span></div>
						<div class="number"><RatingNumber rating={0} outOf={100} /></div>
						<div class="score-link-row"></div>
						<div class="measure-slot"></div>
					</div>
				{/if}
			</div>
		</div>
	{/snippet}

	{#snippet underground()}
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
			<WeedsTally {tally} {litIndex} visible={tallyVisible || (land > 0 && land < 1)} landed={!travels || land >= 1} traceHref={scoreHref} />
		{/if}
	{:else}
		{@render lockup()}
	{/if}
	{/snippet}

	{#snippet after()}
	<!-- Outside the underground: the tally shows while the underground fills the screen, and this foot is past the weeds. -->
	{#if feedbackHref && record}
		<RatingFeedback href={feedbackHref} address={feedbackAddress} about={feedbackAbout} />
	{/if}
	{#if tab === "orgs" && record && routes.whoOrgBadge}
		<p class="show-rating"><a href={localized(routes.whoOrgBadge(record.key))}>{m.ww_rating_badge_link()}</a></p>
	{/if}
	<LessonHand bind:this={lessonHand} name="rating" facts={lessonFacts} rating={lessonDoors} />
	{/snippet}
</RatingGround>

<style>
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

	.unscored {
		font-size: clamp(16px, 1.8vw, 26px);
		font-weight: 700;
	}

	.ghost {
		display: contents;
		visibility: hidden;
	}

	.measure-slot {
		--measure-h: clamp(56px, 6.5vw, 92px);
		height: var(--measure-h);
		display: flex;
		max-width: 100%;
	}

	.number {
		position: relative;
		z-index: 1;
		margin: clamp(4px, 1vh, 12px) 0;
	}

	/* The feedback block's quiet link, centred under it. */
	.show-rating {
		box-sizing: border-box;
		width: min(100%, 720px);
		margin: 0 auto;
		padding: 0 var(--pad, 16px) clamp(32px, 6vh, 72px);
		font-family: var(--rt-font-web);
		font-size: 15px;
		text-align: center;
	}

	.show-rating a {
		color: var(--rtvr-on-dark);
		text-decoration: underline;
		text-decoration-color: var(--color-gold-bar);
		text-underline-offset: 4px;
	}

	/* Under the number, over the sky: a line of its own whose height is held
	   whether or not the line has arrived, so nothing under it moves. */
	.score-link-row {
		height: 1.3em;
		font-size: clamp(14px, 1.2vw, 17px);
		line-height: 1.3;
		max-width: 100%;
	}

	.score-among {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: var(--rt-font-web);
		font-weight: 700;
		margin: 0;
		color: var(--rt-gold-ink);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 260ms ease-out,
			visibility 0s linear 260ms;
	}

	.score-among.revealed {
		opacity: 1;
		visibility: visible;
		transition-delay: 0s;
	}

	@media (scripting: none) {
		.score-among {
			opacity: 1;
			visibility: visible;
		}
	}

	/* "100.0/100" is 3.8 glyph-heights wide, the widest four-character score 3.3:
	   scaled to that footprint it clears the dog, and a phone's 16px gutters. */
	.number-slot.wide {
		--glyph-h: min(calc(clamp(96px, 14vw, 210px) * 0.86), calc((100vw - 32px) / 3.85));
	}

	/* The slot's box is the hidden number's; the ghost lies over it and adds no
	   size of its own, so the number replaces it without a shift. */
	.number-slot {
		--ghost-out: 600ms;
		position: relative;
	}

	.number-ghost {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		pointer-events: none;
		opacity: 1;
		transition: opacity var(--ghost-out) ease-in;
	}

	.number-ghost.gone {
		opacity: 0;
		visibility: hidden;
		transition:
			opacity var(--ghost-out) ease-in,
			visibility 0s linear var(--ghost-out);
	}

	/* Faint enough to read as a shape: a legible "00.0/100" reads as a score of zero. */
	.number-ghost :global(.rating-number) {
		opacity: 0.11;
		filter: none;
	}

	.number-ghost :global(.out-of) {
		transition: opacity 120ms ease-in;
	}

	/* Its "/100" goes first, so the landing number's "/100" never shows beside it. */
	.number-ghost.gone :global(.out-of) {
		opacity: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.number-ghost :global(.rating-number) {
			animation: ghost-pulse 2.4s ease-in-out infinite alternate;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.number-slot {
			--ghost-out: 260ms;
		}
	}

	@keyframes ghost-pulse {
		from {
			opacity: 0.07;
		}
		to {
			opacity: 0.15;
		}
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

	/* The follower carries the number down; its "/100" stays out of the travel. */
	.number.away :global(.rating-number) {
		visibility: hidden;
	}

	.number :global(.out-of) {
		transition: opacity 120ms ease-in;
	}

	.number.away :global(.out-of) {
		visibility: visible;
		opacity: 0;
	}

	/* No script, no dog: a crawler or a reader without JS gets the number as the HTML carries it. */
	@media (scripting: none) {
		.number {
			opacity: 1;
			visibility: visible;
			transform: none;
		}

		.number-ghost {
			display: none;
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

	.soil-band {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: clamp(28px, 5vh, 56px) var(--pad) clamp(18px, 3vh, 36px);
		transition: padding 220ms ease-out;
	}

	/* Pinned over the weeds, the lockup compacts so the table gets the room;
	   above the pin it reads at full size. */
	:global(.weeds-pin.pinned) .soil-band {
		padding-top: 10px;
		padding-bottom: 6px;
	}

	:global(.weeds-pin.pinned) .lockup {
		--lockup-h: calc(clamp(30px, 5.5vw, 78px) * 0.57);
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
		transition: height 220ms ease-out;
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
		transition:
			height 220ms ease-out,
			margin 220ms ease-out;
		pointer-events: none;
		filter:
			drop-shadow(var(--rim) 0 0 var(--rt-yellow-bright))
			drop-shadow(calc(-1 * var(--rim)) 0 0 var(--rt-yellow-bright))
			drop-shadow(0 var(--rim) 0 var(--rt-yellow-bright))
			drop-shadow(0 calc(-1 * var(--rim)) 0 var(--rt-yellow-bright))
			drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	@media (prefers-reduced-motion: reduce) {
		.soil-band,
		.sticker :global(svg),
		.shovel {
			transition: none;
		}
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

		/* Full width, so a wider number never moves the column's own box. */
		.score-column {
			justify-self: stretch;
			align-items: center;
			padding-left: 0;
			text-align: center;
		}

		.number-ghost {
			justify-content: center;
		}
	}

	/* A phone: the header shares its row with the globe and the help sticker,
	   so the bar spans the screen at the search page's size. */
	@media (max-width: 720px) {
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

		.name,
		.measure-slot,
		.score-link-row {
			flex-basis: 100%;
		}

		.measure-slot {
			justify-content: center;
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
