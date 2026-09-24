<script lang="ts">
import FindRaw from "./homeAssets/Search_page_Find.svg?raw";
import TruthInReforestationRaw from "./homeAssets/Search_page_Truth_in_Reforestation.svg?raw";
import OrgsSelectedRaw from "./homeAssets/Search_page_Orgs_Selected.svg?raw";
import OrgsUnselectedRaw from "./homeAssets/Search_page_Orgs_Unselected.svg?raw";
import ProjectsSelectedRaw from "./homeAssets/Search_page_Projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "./homeAssets/Search_page_Projects_Unselected.svg?raw";
import GrassMascot from "./GrassMascot.svelte";
import GrassTufts from "./GrassTufts.svelte";
import GlobeSpinIcon from "./GlobeSpinIcon.svelte";
import SearchBar from "./SearchBar.svelte";
import poly1Raw from "./homeAssets/poly/Search_page_SP_poly_1.svg?raw";
import poly2Raw from "./homeAssets/poly/Search_page_SP_poly_2.svg?raw";
import poly3Raw from "./homeAssets/poly/Search_page_SP_poly_3.svg?raw";
import poly4Raw from "./homeAssets/poly/Search_page_SP_poly_4.svg?raw";
import poly5Raw from "./homeAssets/poly/Search_page_SP_poly_5.svg?raw";
import poly6Raw from "./homeAssets/poly/Search_page_SP_poly_6.svg?raw";
import poly7Raw from "./homeAssets/poly/Search_page_SP_poly_7.svg?raw";
import poly8Raw from "./homeAssets/poly/Search_page_SP_poly_8.svg?raw";
import poly9Raw from "./homeAssets/poly/Search_page_SP_poly_9.svg?raw";
import poly10Raw from "./homeAssets/poly/Search_page_SP_poly_10.svg?raw";
import poly11Raw from "./homeAssets/poly/Search_page_SP_poly_11.svg?raw";
import MiddleDividerRaw from "./homeAssets/poly/Search_page_Middle_Divider.svg?raw";

// Imported, never a leading-slash URL: an import is bundled into whatever app builds this child.
import skyUrl from "./assets/golden_sky_background.webp";
import hillPatternWebp from "./assets/hill_pattern.webp";
import hillPatternAvif from "./assets/hill_pattern.avif";
import hillFillWebp from "./assets/pub-Rtvr/home/hill_fill.webp";
import hillFillAvif from "./assets/pub-Rtvr/home/hill_fill.avif";
import upperGrassFrontWebp from "./assets/pub-Rtvr/home/uppergrass_front.webp";
import upperGrassFrontAvif from "./assets/pub-Rtvr/home/uppergrass_front.avif";
import upperGrassBackWebp from "./assets/pub-Rtvr/home/uppergrass_back.webp";
import upperGrassBackAvif from "./assets/pub-Rtvr/home/uppergrass_back.avif";
import {
	HEADLINE,
	HOME,
	depthOf,
	layerOf,
	layoutPage,
	parallaxY,
	type Placed,
} from "./shardLayout";
// Shard ids come from the index, never a literal typed here.
import { byArt, shard, shardId } from "./shared/shardIndex";
import type { WhoWhatRoutes } from "./whoWhatTypes";
import type { SearchListItem } from "./searchTypes";
import type { Snippet } from "svelte";

// Tabs are plain <a> links so hover preload starts the target's load. The results pages render this same component via the `results` snippet.
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
	topKeys = [],
	onsearch,
	onpick,
	onactivate,
	listLoading = false,
	results,
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
	/** Most-searched keys, best first — orders the empty-query dropdown. */
	topKeys?: string[];
	onsearch?: (query: string, tab: "orgs" | "projects") => void;
	/** The row's own link navigates; the route only counts the pick. */
	onpick?: (item: SearchListItem, tab: "orgs" | "projects") => void;
	onactivate?: () => void;
	listLoading?: boolean;
	/** Absent on the search page itself. */
	results?: Snippet;
} = $props();

const listItems = $derived(activeTab === "orgs" ? orgs : projects);

const searchIndex = $derived(
	listItems.map((item) => ({ item, hay: item.name.toLowerCase() })),
);

// The loader applies no limit; a broad match could mount thousands of rows.
const MAX_DROPDOWN_ROWS = 50;
const TOP_ROWS = 5;
const filtered = $derived.by(() => {
	const q = query.trim().toLowerCase();
	if (q) {
		const matches = searchIndex.filter((e) => e.hay.includes(q));
		return {
			total: matches.length,
			rows: matches.slice(0, MAX_DROPDOWN_ROWS).map((e) => e.item),
		};
	}
	const byKey = new Map(listItems.map((item) => [item.key, item]));
	const top = topKeys
		.map((k) => byKey.get(k))
		.filter((item): item is SearchListItem => item !== undefined);
	const seen = new Set(top.map((item) => item.key));
	const fill = listItems.filter((item) => !seen.has(item.key));
	return {
		total: listItems.length,
		rows: [...top, ...fill].slice(0, TOP_ROWS),
	};
});

// -1 = the input itself; focus never leaves the field.
let highlighted = $state(-1);
const LIST_ID = "home-search-list";
const rowId = (i: number) => `${LIST_ID}-row-${i}`;

$effect(() => {
	filtered.rows;
	dropdownOpen;
	highlighted = -1;
});

function moveHighlight(dir: 1 | -1) {
	const n = filtered.rows.length;
	if (n === 0) return;
	highlighted = Math.min(n - 1, Math.max(-1, highlighted + dir));
	if (highlighted >= 0) {
		document
			.getElementById(rowId(highlighted))
			?.scrollIntoView({ block: "nearest" });
	}
}

// While the list is open, submit takes the highlighted row (top row if none) so a partial query lands somewhere.
function submit(q: string) {
	if (dropdownOpen && filtered.rows.length > 0) {
		const item = filtered.rows[Math.max(0, highlighted)];
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

// No preventDefault: the anchor navigates. A modified click opens elsewhere, so the bar stays as it was.
function pickRow(e: MouseEvent, item: SearchListItem) {
	onpick?.(item, activeTab);
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	selectItem(item);
}

let searchWrapEl = $state<HTMLElement | null>(null);

function dismissOnOutside(e: PointerEvent) {
	if (!dropdownOpen) return;
	if (searchWrapEl && !searchWrapEl.contains(e.target as Node)) {
		dropdownOpen = false;
	}
}

function dismissOnEscape(e: KeyboardEvent) {
	if (dropdownOpen && e.key === "Escape") {
		dropdownOpen = false;
		// Chrome also clears a type="search" field on Escape; leave that to a second press.
		e.preventDefault();
	}
}

// The shard photos are `<image href>`s inside the SVG text, which `?raw` leaves
// unresolved; withLocalPhotos swaps in the bundled URLs. A miss paints violet
// via --rtvr-missing-art.
const SHARD_PHOTOS = import.meta.glob<string>(
	"./assets/pub-Rtvr/home/poly/*.webp",
	{ eager: true, query: "?url", import: "default" },
);

function withLocalPhotos(svg: string): string {
	return svg.replace(
		/href="[^"]*\/pub-Rtvr\/home\/poly\/([^"]+)"/g,
		(whole, file: string) => {
			const hit = Object.entries(SHARD_PHOTOS).find(([path]) =>
				path.endsWith(`/${file}`),
			);
			return hit ? `href="${hit[1]}"` : whole;
		},
	);
}

const shardArt: Record<number, string> = {
	1: withLocalPhotos(poly1Raw),
	2: withLocalPhotos(poly2Raw),
	3: withLocalPhotos(poly3Raw),
	4: withLocalPhotos(poly4Raw),
	5: withLocalPhotos(poly5Raw),
	6: withLocalPhotos(poly6Raw),
	7: withLocalPhotos(poly7Raw),
	8: withLocalPhotos(poly8Raw),
	9: withLocalPhotos(poly9Raw),
	10: withLocalPhotos(poly10Raw),
	11: withLocalPhotos(poly11Raw),
};

// Empty until measured, so the server renders no shards.
let shards = $state<Placed[]>([]);
let headlineShards = $state<Placed[]>([]);
let heroEl = $state<HTMLElement | null>(null);
let headlineEl = $state<HTMLElement | null>(null);

let scrolled = $state(0);

// One depth reference across BOTH sections, or the headline ring's widest shard
// would drift like a foreground piece while sitting behind one.
const widestShard = $derived(
	Math.max(
		1,
		...shards.map((p) => p.w),
		...headlineShards.map((p) => p.w),
	),
);

const searchShards = byArt("search");

// Resolved here: `{#each shards as shard}` shadows the imported shard() in the markup.
const dividerId = shardId(shard(26));

// An unregistered artwork gets a deliberately ugly id, not a plausible one.
const idForArt = (art: number) => {
	const entry = searchShards.get(art);
	return entry ? shardId(entry) : `search_shard-UNREGISTERED-art${art}`;
};

// The headline ring's parallax starts from zero as it enters the viewport,
// not from the document origin.
let headlineOffset = $state(0);

const headlineScrolled = $derived(Math.max(0, scrolled - headlineOffset));

function resolveShards() {
	if (!heroEl || !headlineEl) return;
	const vw = heroEl.clientWidth;
	const heroH = heroEl.clientHeight;
	const headH = headlineEl.clientHeight;
	if (vw <= 0 || heroH <= 0 || headH <= 0) return;

	const [hero, head] = layoutPage(vw, [
		{ height: heroH, specs: HOME },
		{ height: headH, specs: HEADLINE },
	]);
	shards = hero;
	headlineShards = head;
}

// --hero-top feeds the fold rule; the site header sits above the hero but
// outside this component, so its height can only be measured.
let lastHeroTop = -1;
function measureHeroTop() {
	if (!heroEl) return;
	const top = Math.round(heroEl.getBoundingClientRect().top + window.scrollY);
	// The write re-dirties layout even when nothing moved.
	if (top === lastHeroTop) return;
	lastHeroTop = top;
	heroEl.style.setProperty("--hero-top", `${top}px`);
}

function measureHeadlineOffset() {
	if (!headlineEl) return;
	// Minus one viewport: parallax starts as the section ENTERS view.
	const top = headlineEl.getBoundingClientRect().top + window.scrollY;
	headlineOffset = Math.max(0, top - window.innerHeight);
}

$effect(() => {
	if (!heroEl && !headlineEl) return;
	resolveShards();
	measureHeroTop();
	measureHeadlineOffset();
	// One solve per frame. measureHeroTop writes to heroEl, which this observer
	// watches, so a synchronous callback could feed itself.
	let raf = 0;
	const schedule = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			resolveShards();
			measureHeroTop();
			measureHeadlineOffset();
		});
	};
	const ro = new ResizeObserver(schedule);
	if (heroEl) ro.observe(heroEl);
	if (headlineEl) ro.observe(headlineEl);
	// The header's height moves the hero without resizing its box.
	window.addEventListener("resize", schedule);

	return () => {
		if (raf) cancelAnimationFrame(raf);
		ro.disconnect();
		window.removeEventListener("resize", schedule);
	};
});

// Its own effect: the layout effect re-runs on every solve and would tear the
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
	// A reload part-way down must not snap on first scroll.
	scrolled = window.scrollY;

	return () => window.removeEventListener("scroll", onScroll);
});
</script>

<svelte:window onpointerdown={dismissOnOutside} onkeydown={dismissOnEscape} />

<!-- Art bound once as custom properties; a missing asset falls through to --rtvr-missing-art. -->
<div class="home-search-page" style="--art-sky: url({skyUrl}); --art-hill-pattern-webp: url({hillPatternWebp}); --art-hill-pattern-avif: url({hillPatternAvif}); --art-hill-fill-webp: url({hillFillWebp}); --art-hill-fill-avif: url({hillFillAvif}); --art-uppergrass-front-webp: url({upperGrassFrontWebp}); --art-uppergrass-front-avif: url({upperGrassFrontAvif}); --art-uppergrass-back-webp: url({upperGrassBackWebp}); --art-uppergrass-back-avif: url({upperGrassBackAvif});">
	<section class="hero-section" class:has-results={results} bind:this={heroEl}>
		{#each shards as shard (shard.id)}
			<!-- Section-prefixed ids: the hero and the headline draw from the same numbered artwork set. -->
			<div
				id={idForArt(shard.id)}
				class="bg-poly"
				aria-hidden="true"
				style:left="{shard.x}px"
				style:top="{shard.y}px"
				style:width="{shard.w}px"
				style:--depth={depthOf(shard, widestShard)}
				style:--layer={layerOf(depthOf(shard, widestShard))}
				style:transform="translateY({parallaxY(depthOf(shard, widestShard), scrolled)}px) rotate({shard.rot ?? 0}deg)"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html shardArt[shard.id]}
			</div>
		{/each}

		<div class="greenery hero-greenery" aria-hidden="true"></div>
		<!-- Back to front: black wash (::before), green wash (::after), the dog, then
		     scattered tufts on top so he passes BEHIND a few of them. -->
		<div class="wildflower-band" aria-hidden="true">
			<GrassMascot ground="grass" />
			<GrassTufts />
		</div>

		<div class="search-card">
			<nav class="tabs" aria-label="Search by">
				<a
					href={routes.who ?? null}
					class="tab-sticker"
					aria-current={activeTab === "orgs" ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html activeTab === "orgs" ? OrgsSelectedRaw : OrgsUnselectedRaw}
				</a>
				<a
					href={routes.what ?? null}
					class="tab-sticker"
					aria-current={activeTab === "projects" ? "page" : undefined}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html activeTab === "projects" ? ProjectsSelectedRaw : ProjectsUnselectedRaw}
				</a>
			</nav>

			<div class="search-bar-wrap" bind:this={searchWrapEl}>
				<SearchBar
					bind:value={query}
					bind:dropdownOpen
					placeholder={activeTab === "orgs" ? "Search organizations…" : "Search projects…"}
					ariaLabel={activeTab === "orgs" ? "Search organizations" : "Search projects"}
					onsearch={submit}
					{onactivate}
					onkeynav={moveHighlight}
					listId={LIST_ID}
					activeDescendant={highlighted >= 0 ? rowId(highlighted) : undefined}
				/>

				<!-- TODO: swap the chrome for the design's drop-window SVG once exported; keep the list. -->
				{#if dropdownOpen}
					<ul class="search-dropdown" id={LIST_ID} role="listbox">
						{#each filtered.rows as item, i (item.key)}
							{@const href = hrefOf(item)}
							{#snippet rowBody()}
								<span class="row-name">{item.name}</span>
								{#if item.hint}
									<span class="row-hint">{item.hint}</span>
								{/if}
							{/snippet}
							<li
								id={rowId(i)}
								role="option"
								aria-selected={i === highlighted}
							>
								<!-- A link so hover preload starts the load; without a host URL map the row can only fill the bar. -->
								{#if href}
									<a
										{href}
										class="dropdown-row"
										class:highlighted={i === highlighted}
										tabindex="-1"
										onclick={(e) => pickRow(e, item)}
									>
										{@render rowBody()}
									</a>
								{:else}
									<button
										type="button"
										class="dropdown-row"
										class:highlighted={i === highlighted}
										tabindex="-1"
										onclick={() => selectItem(item)}
									>
										{@render rowBody()}
									</button>
								{/if}
							</li>
						{:else}
							<li class="dropdown-empty" role="presentation">
								{#if listLoading}
									Loading {activeTab === "orgs"
										? "organizations"
										: "projects"}…
								{:else}
									No {activeTab === "orgs" ? "organizations" : "projects"}
									{query.trim() ? "match" : "loaded"}
								{/if}
							</li>
						{/each}
						{#if filtered.total > filtered.rows.length}
							<li class="dropdown-more" role="presentation">
								Showing {filtered.rows.length} of {filtered.total} — keep
								typing to narrow
							</li>
						{/if}
					</ul>
				{/if}

				<!-- Out of flow so appearing doesn't re-measure the shard sections. -->
				{#if notice}
					<p class="search-notice" role="status" aria-live="polite">{notice}</p>
				{/if}
			</div>

			<div class="caption-row">
				<p class="search-caption">Search transparency rating</p>
				<GlobeSpinIcon class="globe-icon" href={mapHref ?? routes.whoMap} />
			</div>

			<!-- Inside the card so it inherits --bar-scale. -->
			{@render results?.()}
		</div>
	</section>

	<div class="middle-divider" id={dividerId}>
		<div class="middle-divider-photo" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html withLocalPhotos(MiddleDividerRaw)}
		</div>
	</div>

	<!-- One wildflower band on the page: a second at this foot read as the same weeds twice. -->
	<section class="headline-section" bind:this={headlineEl}>
		<div class="greenery headline-greenery" aria-hidden="true"></div>

		{#each headlineShards as shard (shard.id)}
			<div
				id={idForArt(shard.id)}
				class="bg-poly"
				aria-hidden="true"
				style:left="{shard.x}px"
				style:top="{shard.y}px"
				style:width="{shard.w}px"
				style:--depth={depthOf(shard, widestShard)}
				style:--layer={layerOf(depthOf(shard, widestShard))}
				style:transform="translateY({parallaxY(depthOf(shard, widestShard), headlineScrolled)}px) rotate({shard.rot ?? 0}deg)"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html shardArt[shard.id]}
			</div>
		{/each}

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

	/* Band ratios come from the 2049px-wide mobile canvas the art was exported on:
	   uppergrass band 781/2049, crest top to hero-band bottom 902/2049. --art is
	   capped so a desktop viewport doesn't scale them into thousand-pixel bands. */
	.hero-section,
	.headline-section {
		--art: min(100vw, 1200px);
		--upper-band: calc(var(--art) * 0.381);
		/* The floor keeps the band a band on narrow phones. */
		--greenery-h: max(calc(var(--art) * 0.44), 230px);
		/* Overwritten live by measureHeroTop. */
		--hero-top: 80px;
		/* 416px = the search card plus room, a FLOOR: min() would eat into it on
		   tall windows and push the band past the fold. Grows whenever the card does. */
		--hero-chrome: calc(var(--hero-top) + 416px);
		position: relative;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		/* Bottom padding reserves the greenery zone; centring let the caption drift into the wave. */
		padding: clamp(28px, 7vh, 80px) 16px calc(var(--greenery-h) + 16px);
	}

	.hero-section {
		min-height: min(56vh, 620px);
		/* THE FOLD RULE: the band is bottom:0 of this section, so capping the band
		   to the viewport minus the chrome above it lands its foot ON the fold.
		   Capping the band rather than clipping the section keeps the card visible. */
		--greenery-h: clamp(
			230px,
			calc(var(--art) * 0.44),
			max(230px, calc(100dvh - var(--hero-chrome)))
		);
		max-height: 100dvh;
		/* The flat colour matches the painted sky so a taller viewport never shows a cut. */
		background-color: #cc9f47;
		background-image: var(--art-sky, var(--rtvr-missing-art));
		background-size: cover;
		background-position: center top;
		background-repeat: no-repeat;
	}

	/* The results card adds to the search card, so the fold rule must clear it
	   too. Measured: ~145px is its ceiling at the 576px card cap. */
	.hero-section.has-results {
		--hero-chrome: calc(var(--hero-top) + 561px);
	}

	/* Content clears only the dense bottom 0.221 of the band; sparse stems may
	   pass behind the headline, as in the mock. */
	.headline-section {
		min-height: min(50vh, 560px);
		padding-top: clamp(48px, 12vh, 130px);
		padding-bottom: max(calc(var(--art) * 0.25), 150px);
		background: #0b1109;
	}

	/* Each background is declared twice: plain WebP, then image-set() with AVIF
	   first. Safari < 16.4 drops the image-set line and keeps the WebP. */
	.greenery {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		background-repeat: no-repeat;
		z-index: 0;
	}

	/* 100% auto keeps the crest's drawn proportion; the file (0.781 × width
	   deep) always exceeds the box. */
	.hero-greenery {
		top: auto;
		height: var(--greenery-h);
		background-image: var(--art-hill-pattern-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-hill-pattern-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-hill-pattern-webp, var(--rtvr-missing-art)) type("image/webp")
		);
		background-size: 100% auto;
		background-position: top center;
	}

	/* Cropped below the crest's trough so no glow shows under the divider;
	   cover because this box can be taller than the art on phones. */
	.headline-greenery {
		top: 0;
		background-image: var(--art-hill-fill-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-hill-fill-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-hill-fill-webp, var(--rtvr-missing-art)) type("image/webp")
		);
		background-size: cover;
		background-position: top center;
	}

	/* Two aligned layers cropped from the same canvas box; no bottom mask, the
	   blade bases dissolve into the page on their own. */
	.wildflower-band {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--upper-band);
		pointer-events: none;
		z-index: 3;
	}

	/* Numbered, not left to paint order: ::after paints above ordinary children,
	   so without a z-index the green wash would cover the dog and the tufts. */
	.wildflower-band::before,
	.wildflower-band::after {
		content: "";
		position: absolute;
		inset: 0;
		background-size: 100% 100%;
		background-position: center bottom;
		background-repeat: no-repeat;
	}

	.wildflower-band::before {
		z-index: 0;
	}

	.wildflower-band::after {
		z-index: 1;
	}

	.wildflower-band :global(.mascot-track) {
		z-index: 2;
	}

	.wildflower-band :global(.tuft-layer) {
		z-index: 3;
	}

	/* Black silhouette BEHIND green: the dog stacks between the pseudos, in
	   front of the shadow layer and behind the lit blades. */
	.wildflower-band::before {
		background-image: var(--art-uppergrass-front-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-uppergrass-front-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-uppergrass-front-webp, var(--rtvr-missing-art)) type("image/webp")
		);
	}

	.wildflower-band::after {
		background-image: var(--art-uppergrass-back-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-uppergrass-back-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-uppergrass-back-webp, var(--rtvr-missing-art)) type("image/webp")
		);
	}


	/* Position and width are inline from shardLayout.ts; the transform carries
	   ONLY parallax and rotation, so left/top always equal the config. */
	.bg-poly {
		position: absolute;
		pointer-events: none;
		/* The torn border is stroke="currentColor"; this one line colours every shard. */
		color: var(--color-gold-shard);
		/* --layer is an integer 0..-2 from the template: z-index rounds a
		   fractional calc into a hard cut. Subtracted so the nearest band stays
		   at 2, under the grass band (3) the dog runs in front of. */
		z-index: calc(2 + var(--layer, 0));
		will-change: transform;
	}

	/* drop-shadow follows the torn alpha; three shadows from one light source
	   up-left. Keep the alphas ASCENDING outward and the near blur ≥ 6px: a
	   dense crisp near shadow reads as a black outline, not shade.
	   --lift scales with depth and never reaches 0 (a far shard still rests ON the page). */
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

	/* --card-max feeds both max-width and --bar-scale (the bar's SVG is 284.7
	   wide), so every "matched to the input" size tracks the card's real width. */
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

	/* File-folder tabs tucked under the bar's top edge by a negative margin, not
	   absolute positioning: the row must keep its height in flow for the fold rule. */
	.tabs {
		/* A flat 10px: the tuck hides a border plus shadow, constant at every
		   width. Scaled by --bar-scale it cropped the shorter tab's label. */
		--tab-tuck: 10px;
		/* Real px, not viewBox units × --bar-scale (~2× at the cap): the tabs
		   are chrome beside the bar, not matched to the input. */
		--tab-h-idle: clamp(34px, 4.4vw, 46px);
		--tab-h-active: clamp(48px, 6.4vw, 66px);
		display: flex;
		/* Bottoms aligned so both tabs disappear into the same line. */
		align-items: flex-end;
		gap: 16px;
		/* The tuck plus the card's gap. No padding-bottom: it adds back exactly
		   what the margin removes and the tuck moves nothing. */
		margin-bottom: calc(0px - var(--tab-tuck) - clamp(8px, 1.4vw, 16px));
		/* Below .search-bar-wrap, which hides the tabs' bottom border. */
		position: relative;
		z-index: 0;
	}

	.search-bar-wrap {
		position: relative;
		width: 100%;
		/* Above .tabs — stated, not left to source order. */
		z-index: 1;
	}

	/* Overlays the caption: opening must not re-measure the shard sections. */
	.search-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		max-height: min(40vh, 320px);
		overflow-y: auto;
		margin: 0;
		padding: 6px;
		list-style: none;
		background: #000;
		border: 3px solid var(--color-gold-bar);
		border-radius: 2px;
		z-index: 6;
	}

	.dropdown-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		padding: 8px 10px;
		background: none;
		border: none;
		border-radius: 2px;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		box-sizing: border-box;
		text-decoration: none;
	}

	.dropdown-row:hover,
	.dropdown-row:focus-visible,
	.dropdown-row.highlighted {
		background: rgb(250 215 2 / 0.14);
	}

	.search-dropdown li + li {
		position: relative;
	}
	.search-dropdown li + li::before {
		content: "";
		position: absolute;
		top: 0;
		left: 10px;
		right: 10px;
		height: 1px;
		background: #2e3342;
	}

	.row-name {
		color: var(--rtvr-on-dark);
		font-size: 14px;
		line-height: 1.3;
	}

	.row-hint {
		color: #8d93a6;
		font-size: 12px;
		flex-shrink: 0;
	}

	.dropdown-empty {
		padding: 10px;
		color: #8d93a6;
		font-size: 13px;
	}

	.dropdown-more {
		padding: 8px 10px;
		color: #8d93a6;
		font-size: 12px;
		font-style: italic;
		border-top: 1px solid rgba(141, 147, 166, 0.2);
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

	/* Height per state on the link; width follows each SVG's own aspect. */
	.tab-sticker {
		display: block;
		height: var(--tab-h-idle);
		transition: height 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.tab-sticker[aria-current="page"] {
		height: var(--tab-h-active);
	}

	/* Brighten, never rotate or grow: a tilt swings the tucked edge out from
	   under the bar, and size now means "selected". Both tabs respond. */
	.tab-sticker:hover :global(svg),
	.tab-sticker:focus-visible :global(svg) {
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.34))
			drop-shadow(4px 8px 14px rgb(12 8 1 / 0.48))
			drop-shadow(12px 18px 28px rgb(12 8 1 / 0.56))
			brightness(1.18);
	}

	/* Same shadow recipe as the shards; alphas ascend outward and the near
	   shadow is blurred — a crisp dark rule along the tucked seam undoes the tuck. */
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

	/* The input's font-size is in SVG user units scaled by --bar-scale; the
	   caption uses the same units so it tracks the input at every width. */
	.search-caption {
		flex: 0 1 auto;
		max-width: 420px;
		text-align: center;
		color: #1d1405;
		font-size: calc(18 * var(--bar-scale));
		line-height: 1.35;
		margin: 0;
		/* Text shadow, not a filter: cheaper and keeps glyph edges crisp. */
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

	/* Wider than the viewport so both jagged ends are cut by the page edge. */
	.middle-divider {
		position: relative;
		align-self: center;
		width: 116vw;
		flex-shrink: 0;
		/* The SVG's own viewBox. */
		aspect-ratio: 1254.0259 / 94.484817;
		overflow: visible;
		z-index: 3;
		/* The strip's own backing navy, so the uncovered corner wedges read as
		   one band rather than holes. */
		background: #171d31;
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

	/* 550px is the Get Cache breakpoint. On a phone the bar spans the screen, so
	   "matching the input" would make the caption headline-sized. */
	@media (max-width: 550px) {
		.search-caption {
			font-size: 18px;
		}

		.caption-row :global(.globe-icon) {
			width: 56px;
		}
	}
</style>
