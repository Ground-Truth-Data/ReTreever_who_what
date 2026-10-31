<script lang="ts">
// The weeds under the rating: the tab strip, the weeds bar and one table per
// tab. Each table is fetched once and kept; the bar narrows the rows it has.
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { loadClips, type ClipManifest } from "$gc/frameClips";
import WeedsBarArt from "../assets/svg/rating/Rating_page_weeds_search_bar.svg?raw";
import WeedsTable from "./WeedsTable.svelte";
import WeedsTabs from "./WeedsTabs.svelte";
import { filterRows } from "./weedsFormat";
import { scrollTopFor, tabIndexFor } from "./weedsScroll";
import { WEEDS_TABLES, type WeedsAnswer, type WeedsRow, type WeedsTable as WeedsTableName } from "../whoWhatTypes";

let {
	tab,
	href,
	clipRoot = undefined,
	onopenproject = undefined,
	onactive = undefined,
}: {
	tab: "orgs" | "projects";
	/** The host's URL for one table of this record. */
	href: (table: WeedsTableName) => string;
	clipRoot?: string;
	/** An org's Projects row picked; absent, the names are plain text. */
	onopenproject?: (projectKey: string) => void;
	/** The lit tab's index, whenever it changes — by scroll, click or key. */
	onactive?: (index: number) => void;
} = $props();

const PANEL_ID = "weeds-panel";
// The art keeps its aspect until the bar's floor wins, then stretches to stay tappable at 390.
const WeedsBarRaw = WeedsBarArt.replace("<svg", '<svg preserveAspectRatio="none"');
const FETCH_CLIP = "fetch-seedling";

let active = $state<WeedsTableName>("projects");
let answers = $state<Partial<Record<WeedsTableName, WeedsAnswer>>>({});
let failed = $state<Partial<Record<WeedsTableName, true>>>({});
let inFlight = new Set<WeedsTableName>();
let loading = $state<Partial<Record<WeedsTableName, true>>>({});
let query = $state("");
let manifest = $state<ClipManifest | null>(null);
let trackEl = $state<HTMLElement | null>(null);
let stageEl = $state<HTMLElement | null>(null);
let runEl = $state<HTMLElement | null>(null);

async function load(table: WeedsTableName) {
	if (answers[table] || inFlight.has(table)) return;
	inFlight.add(table);
	loading = { ...loading, [table]: true };
	try {
		const res = await fetch(href(table));
		if (!res.ok) throw new Error(`${table}: ${res.status}`);
		answers = { ...answers, [table]: (await res.json()) as WeedsAnswer };
		const { [table]: _gone, ...rest } = failed;
		failed = rest;
	} catch (cause) {
		// A fetch the browser cut short because the page is leaving is not a failure worth a line.
		if (!leaving) console.error("weeds: could not load", cause);
		failed = { ...failed, [table]: true };
		inFlight.delete(table);
	} finally {
		const { [table]: _done, ...rest } = loading;
		loading = rest;
	}
}

function select(table: WeedsTableName) {
	active = table;
	load(table);
}

$effect(() => {
	onactive?.(WEEDS_TABLES.indexOf(active));
});

// The page scroll walks the tabs: the track is one step per tab, the stage
// pins inside it, and the scroll position alone says which tab is lit. The
// browser owns the scroll; this only reads it.
let landing: { top: number; until: number } | null = null;

function pick(table: WeedsTableName) {
	select(table);
	const track = trackEl;
	const run = runEl;
	if (!track || !run) return;
	const top = Math.round(scrollTopFor(WEEDS_TABLES.indexOf(table), pinTop(track), stepOf(run)));
	const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	// The listener would read every segment the smooth scroll passes through;
	// it waits for the landing, or gives up when the scroll stops short.
	landing = { top, until: performance.now() + 1500 };
	window.scrollTo({ top, behavior: instant ? "instant" : "smooth" });
}

/** The lesson's pick: resolves once the smooth scroll has landed, or given up. */
export function lessonPick(table: WeedsTableName): Promise<void> {
	pick(table);
	return new Promise((resolve) => {
		const poll = () => (landing && performance.now() < landing.until ? requestAnimationFrame(poll) : resolve());
		poll();
	});
}

export function litTable(): WeedsTableName {
	return active;
}

/** The page y at which the stage pins under the nav. */
export function stagePin(): number | null {
	return trackEl ? pinTop(trackEl) : null;
}

// Progress 0 is where the stage pins, so index 0 lands exactly under the nav
// and the last index is the point the stage unpins.
function pinTop(track: HTMLElement) {
	const stageTop = stageEl ? parseFloat(getComputedStyle(stageEl).top) || 0 : 0;
	return track.getBoundingClientRect().top + window.scrollY - stageTop;
}

function stepOf(run: HTMLElement) {
	return run.getBoundingClientRect().height / (WEEDS_TABLES.length - 1);
}

$effect(() => {
	const track = trackEl;
	const run = runEl;
	if (!track || !run) return;
	let raf = 0;
	const read = () => {
		raf = 0;
		const y = window.scrollY;
		if (landing) {
			if (Math.abs(y - landing.top) > 2 && performance.now() < landing.until) return;
			landing = null;
		}
		const index = tabIndexFor(y - pinTop(track), stepOf(run), WEEDS_TABLES.length);
		if (index !== WEEDS_TABLES.indexOf(active)) select(WEEDS_TABLES[index]);
	};
	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(read);
	};
	const onScrollEnd = () => {
		if (landing) landing.until = 0;
		onScroll();
	};
	read();
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("scrollend", onScrollEnd, { passive: true });
	window.addEventListener("resize", onScroll);
	return () => {
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("scrollend", onScrollEnd);
		window.removeEventListener("resize", onScroll);
		if (raf) cancelAnimationFrame(raf);
	};
});

// The first tab fills itself once the hero has painted, like the dropdown
// lists; then the rest follow in strip order, one in flight at a time, so the
// rows are there before the scroll lights a tab. The lit tab's own load in
// select() runs beside the queue, so it never waits its turn.
let live = true;
let leaving = false;
async function fillTheRest() {
	for (const table of WEEDS_TABLES) {
		if (!live) return;
		if (!answers[table] && !failed[table]) await load(table);
	}
}
$effect(() => {
	const start = () => void load("projects").then(fillTheRest);
	const idle = window.requestIdleCallback?.(start, { timeout: 2000 });
	const timer = idle === undefined ? setTimeout(start, 200) : undefined;
	const onLeave = () => {
		leaving = true;
	};
	window.addEventListener("pagehide", onLeave);
	return () => {
		live = false;
		window.removeEventListener("pagehide", onLeave);
		if (idle !== undefined) window.cancelIdleCallback?.(idle);
		if (timer) clearTimeout(timer);
	};
});

$effect(() => {
	if (!clipRoot) return;
	let live = true;
	loadClips(clipRoot)
		.then((m) => {
			if (live) manifest = m;
		})
		.catch(() => {});
	return () => {
		live = false;
	};
});

const answer = $derived(answers[active]);
const rows = $derived(answer ? filterRows(answer.rows, answer.columns, query) : []);
const fetchClip = $derived(manifest && clipRoot ? manifest.clips[FETCH_CLIP] : undefined);
const open = $derived(
	tab === "orgs" && active === "projects" && onopenproject
		? {
				column: "projectName",
				on: (row: WeedsRow) => {
					const key = row.projectKey;
					if (typeof key === "string") onopenproject(key);
				},
			}
		: undefined,
);

function barKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") {
		query = "";
		e.preventDefault();
	}
}
</script>

<div class="weeds-track" style:--weeds-n={WEEDS_TABLES.length} bind:this={trackEl}>
<section class="weeds-stage" aria-label="The weeds" bind:this={stageEl}>
	<WeedsTabs {active} onselect={pick} panelId={PANEL_ID} />

	<form class="weeds-bar" role="search" onsubmit={(e) => e.preventDefault()}>
		<div class="bar-art" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html WeedsBarRaw}
		</div>
		<input
			type="search"
			class="bar-input"
			placeholder="Filter these rows…"
			aria-label="Filter the {active} rows"
			bind:value={query}
			onkeydown={barKeydown}
		/>
		{#if query}
			<button type="button" class="bar-clear" aria-label="Clear the filter" onclick={() => (query = "")}>
				<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 8 8M8 2 2 8" /></svg>
			</button>
		{/if}
		<button type="submit" class="bar-submit" aria-label="Filter"></button>
	</form>

	<div id={PANEL_ID} class="panel" role="tabpanel" aria-labelledby="weeds-tab-{active}" aria-busy={!!loading[active]}>
		{#if answer}
			{#if answer.rows.length === 0}
				<p class="note">Nothing here yet.</p>
			{:else}
				<WeedsTable columns={answer.columns} {rows} {open} />
				<p class="count" aria-live="polite">
					{#if query}{rows.length} of {answer.rows.length} rows{:else if answer.more}{answer.rows.length} of more — the first {answer.rows.length} rows are shown{:else}{answer.rows.length} {answer.rows.length === 1 ? "row" : "rows"}{/if}
				</p>
			{/if}
		{:else if failed[active]}
			<p class="note">Could not load this table.</p>
		{:else if fetchClip && clipRoot}
			<div class="digging" aria-label="Digging…">
				<FrameClipPlayer root={clipRoot} clip={FETCH_CLIP} facts={fetchClip} loop />
			</div>
		{:else}
			<p class="note">Digging…</p>
		{/if}
	</div>
</section>
<div class="run" aria-hidden="true" bind:this={runEl}></div>
</div>

<style>
	/* One step of page scroll per tab; the run below the stage is the other
	   N - 1 steps, so the stage pins for exactly that long. The nav above is
	   5rem and sticky, so the stage pins under it. */
	.weeds-track {
		--weeds-step: clamp(320px, 60vh, 640px);
		--stage-top: var(--host-chrome, 5rem);
		position: relative;
		z-index: 6;
		width: 100%;
		box-sizing: border-box;
		/* The page sets this when a tally stands at the right edge: the stage
		   gives it the column and leans only half that way, so it still reads
		   as the page's centre under the lockup. */
		padding-right: var(--stage-room, 0px);
		padding-left: calc(var(--stage-room, 0px) / 2);
		/* A new tab's table changes the stage's height; left to anchor on the
		   run below it, the browser would scroll the page by that growth, and
		   the scroll would read the next tab from it. */
		overflow-anchor: none;
	}

	.run {
		height: calc((var(--weeds-n) - 1) * var(--weeds-step));
	}

	.weeds-stage {
		--card-max: 1180px;
		--tab-h: clamp(44px, 3.4vw, 56px);
		position: sticky;
		top: var(--stage-top);
		width: 100%;
		max-width: var(--card-max);
		/* The table takes what is left below the tabs and the bar, and scrolls
		   inside; the floor keeps it usable on a short viewport. */
		max-height: max(calc(100dvh - var(--stage-top)), 520px);
		margin: 0 auto;
		padding: calc(var(--tab-h) * 1.2) clamp(16px, 3vw, 40px) clamp(32px, 5vh, 72px);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 14px;
		font-family: var(--rt-font-web);
		color: var(--rtvr-on-dark);
	}

	/* The bar's art is 685.4 × 49.1; the input and the button sit on its two panels. */
	.weeds-bar {
		position: relative;
		width: 100%;
		aspect-ratio: 685.4 / 49.1;
		min-height: 44px;
		margin: 0;
	}

	.bar-art {
		position: absolute;
		inset: 0;
	}

	.bar-art :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		filter:
			drop-shadow(1px 2px 2px rgb(12 8 1 / 0.7))
			drop-shadow(4px 7px 8px rgb(12 8 1 / 0.55));
	}

	.bar-input {
		position: absolute;
		left: 7.5%;
		top: 16%;
		width: 68%;
		height: 68%;
		min-width: 0;
		padding: 0 28px 0 0;
		margin: 0;
		background: transparent;
		border: none;
		outline: none;
		color: var(--rtvr-on-dark);
		font-family: inherit;
		font-size: clamp(14px, 1.4vw, 18px);
		caret-color: var(--color-gold-bar);
		-webkit-appearance: none;
		appearance: none;
	}

	.bar-input::placeholder {
		color: #8d93a6;
	}

	.bar-input::-webkit-search-decoration,
	.bar-input::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}

	.bar-input:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}

	.bar-clear {
		position: absolute;
		left: 72%;
		top: 20%;
		width: 24px;
		height: 60%;
		padding: 0;
		display: grid;
		place-items: center;
		background: none;
		border: none;
		cursor: pointer;
		color: #8d93a6;
	}

	.bar-clear svg {
		width: 10px;
		height: 10px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.bar-clear:hover,
	.bar-clear:focus-visible {
		color: var(--color-gold-shard);
	}

	.bar-submit {
		position: absolute;
		left: 77.5%;
		top: 8%;
		width: 21%;
		height: 84%;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 3px;
		cursor: pointer;
	}

	.bar-submit:hover {
		background: rgb(245 161 25 / 0.2);
	}

	.bar-submit:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 1px;
	}

	.panel {
		width: 100%;
		min-width: 0;
		min-height: calc(var(--tab-h) * 3);
		flex: 0 1 auto;
		display: flex;
		flex-direction: column;
	}

	.note,
	.count {
		margin: 8px 0 0;
		color: #8d93a6;
		font-size: 14px;
	}

	.digging {
		display: grid;
		place-items: center;
		padding: 12px 0;
		overflow: hidden;
	}

	.digging :global(.frame-clip) {
		max-width: 100%;
	}

	@media (max-width: 860px) {
		.weeds-stage {
			padding-left: 16px;
			padding-right: 16px;
		}
	}

	/* On a phone the transparent controls take the bar's full 44px height;
	   the clear takes the input's right padding. */
	@media (max-width: 767px) {
		.bar-input,
		.bar-submit {
			top: 0;
			height: 100%;
		}

		.bar-input {
			padding-right: 44px;
		}

		.bar-clear {
			left: calc(75.5% - 44px);
			top: 0;
			width: 44px;
			height: 100%;
		}
	}
</style>
