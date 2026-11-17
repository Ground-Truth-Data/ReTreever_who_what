<script lang="ts">
// The weeds under the rating: the tab strip, the weeds bar and one table per
// tab. Each table is fetched once and kept; the bar narrows the rows it has.
import type { Snippet } from "svelte";
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { loadClips, type ClipManifest } from "$gc/frameClips";
import WeedsBarArt from "../assets/svg/rating/Rating_page_weeds_search_bar.svg?raw";
import WeedsBarPhoneArt from "../assets/svg/rating/Rating_page_weeds_search_bar_phone.svg?raw";
import WeedsTable from "./WeedsTable.svelte";
import WeedsCount from "./WeedsCount.svelte";
import NeverPublished from "./NeverPublished.svelte";
import WeedsTabs from "./WeedsTabs.svelte";
import { filterRows, splitPublished } from "./weedsFormat";
import { columnLabel } from "./columnLabels";
import { TABLE_LABELS } from "./tallyMath";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";
import { cueFor, progressFor, scrollTopFor, tabIndexFor } from "./weedsScroll";
import { WEEDS_TABLES, type WeedsAnswer, type WeedsRow, type WeedsTable as WeedsTableName } from "../whoWhatTypes";

let {
	tab,
	href,
	head = undefined,
	clipRoot = undefined,
	onopenproject = undefined,
	onactive = undefined,
}: {
	tab: "orgs" | "projects";
	/** The host's URL for one table of this record. */
	href: (table: WeedsTableName) => string;
	/** Pins above the stage, at the page's full width, for as long as the stage does. */
	head?: Snippet;
	clipRoot?: string;
	/** An org's Projects row picked; absent, the names are plain text. */
	onopenproject?: (projectKey: string) => void;
	/** The lit tab's index, whenever it changes — by scroll, click or key. */
	onactive?: (index: number) => void;
} = $props();

const PANEL_ID = "weeds-panel";
const FETCH_CLIP = "fetch-seedling";

let active = $state<WeedsTableName>("projects");
let answers = $state<Partial<Record<WeedsTableName, WeedsAnswer>>>({});
let failed = $state<Partial<Record<WeedsTableName, true>>>({});
let inFlight = new Set<WeedsTableName>();
let loading = $state<Partial<Record<WeedsTableName, true>>>({});
let query = $state("");
let manifest = $state<ClipManifest | null>(null);
let trackEl = $state<HTMLElement | null>(null);
let pinEl = $state<HTMLElement | null>(null);
let headH = $state(0);
let runEl = $state<HTMLElement | null>(null);
let progress = $state(0);
// Until the reader first scrolls into the run, the dig line tugs; never again in this page view.
let fresh = $state(true);
// At or past the pin: the host may compact its head to give the table room.
let pinned = $state(false);

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

/** The cue's button: one table on, or past the run from the last. */
function next() {
	const i = WEEDS_TABLES.indexOf(active);
	if (i < WEEDS_TABLES.length - 1) return pick(WEEDS_TABLES[i + 1]);
	const track = trackEl;
	if (!track) return;
	const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	window.scrollTo({ top: pinTop(track) + track.getBoundingClientRect().height, behavior: instant ? "instant" : "smooth" });
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
	const stickTop = pinEl ? parseFloat(getComputedStyle(pinEl).top) || 0 : 0;
	return track.getBoundingClientRect().top + window.scrollY - stickTop;
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
		// The dig line follows every frame, a smooth landing's included.
		const offset = y - pinTop(track);
		pinned = offset >= -1;
		progress = progressFor(offset, stepOf(run), WEEDS_TABLES.length);
		if (progress > 0.15) fresh = false;
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
const at = $derived(WEEDS_TABLES.indexOf(active));
const cue = $derived.by(() => {
	const total = WEEDS_TABLES.length;
	const kind = cueFor(at, total);
	if (kind === "first") return m.ww_rating_weeds_cue_first({ total });
	if (kind === "last") return m.ww_rating_weeds_cue_last();
	return m.ww_rating_weeds_cue_next({ table: TABLE_LABELS[WEEDS_TABLES[at + 1]] });
});
const rows = $derived(answer ? filterRows(answer.rows, answer.columns, query) : []);
// The project column is context, not a field: a table publishing nothing else says so instead of drawing it.
const split = $derived(answer ? splitPublished(answer.columns, answer.rows) : null);
const bare = $derived(!!split && split.shown.every((c) => c.key === "project"));
const from = $derived(
	answer?.platforms.length
		? m.ww_rating_weeds_from({ platforms: new Intl.ListFormat(getLocale(), { type: "conjunction" }).format(answer.platforms) })
		: null,
);
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
<div class="weeds-pin" class:pinned style:--head-h="{headH}px" bind:this={pinEl}>
{#if head}
	<div class="weeds-head" bind:clientHeight={headH}>{@render head()}</div>
{/if}
<div class="weeds-lean">
<section class="weeds-stage" aria-label={m.ww_rating_weeds()}>
	<WeedsTabs {active} onselect={pick} panelId={PANEL_ID} {progress} {fresh} />

	<!-- What the scroll does, said where the reader is already looking. Not a live region: the panel announces. -->
	<div class="cue">
		<span class="cue-count">{m.ww_rating_weeds_cue_count({ index: at + 1, total: WEEDS_TABLES.length })}</span>
		<button type="button" class="cue-next" onclick={next}>
			<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6" /></svg>
			<span>{cue}</span>
		</button>
	</div>

	<form class="weeds-bar" role="search" onsubmit={(e) => e.preventDefault()}>
		<div class="bar-art wide" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html WeedsBarArt}
		</div>
		<div class="bar-art phone" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html WeedsBarPhoneArt}
		</div>
		<input
			type="search"
			class="bar-input"
			placeholder={m.ww_rating_weeds_filter_placeholder()}
			aria-label={m.ww_rating_weeds_filter_label({ table: TABLE_LABELS[active].toLowerCase() })}
			bind:value={query}
			onkeydown={barKeydown}
		/>
		{#if query}
			<button type="button" class="bar-clear" aria-label={m.ww_rating_weeds_filter_clear()} onclick={() => (query = "")}>
				<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 8 8M8 2 2 8" /></svg>
			</button>
		{/if}
		<button type="submit" class="bar-submit" aria-label={m.ww_rating_weeds_filter_submit()}></button>
	</form>

	<div id={PANEL_ID} class="panel" role="tabpanel" aria-labelledby="weeds-tab-{active}" aria-busy={!!loading[active]}>
		{#if answer}
			{#if from && answer.rows.length > 0}
				<p class="from">{from}</p>
			{/if}
			{#if answer.rows.length === 0}
				<div class="state">
					<WeedsCount count={0} text={m.ww_rating_weeds_rows({ count: 0 })} />
					<p class="state-line">{m.ww_rating_weeds_empty()}</p>
				</div>
			{:else if bare && split}
				<div class="state">
					<WeedsCount
						count={answer.rows.length}
						text={answer.more ? m.ww_rating_weeds_rows_capped({ count: answer.rows.length }) : m.ww_rating_weeds_rows({ count: answer.rows.length })}
					/>
					<NeverPublished fields={split.missing.map(columnLabel)} />
				</div>
			{:else}
				<WeedsTable columns={answer.columns} {rows} all={answer.rows} sweep={active} {open} />
				<div class="foot">
					<p class="count" aria-live="polite">
						{#if query}
							<WeedsCount count={rows.length} text={m.ww_rating_weeds_rows_filtered({ shown: rows.length, total: answer.rows.length })} />
						{:else if answer.more}
							<WeedsCount count={answer.rows.length} text={m.ww_rating_weeds_rows_capped({ count: answer.rows.length })} />
						{:else}
							<WeedsCount count={answer.rows.length} text={m.ww_rating_weeds_rows({ count: answer.rows.length })} />
						{/if}
					</p>
					{#if split?.missing.length}
						<NeverPublished fields={split.missing.map(columnLabel)} />
					{/if}
				</div>
			{/if}
		{:else if failed[active]}
			<div class="state">
				<p class="state-line">{m.ww_rating_weeds_failed()}</p>
				<button type="button" class="retry" onclick={() => void load(active)}>{m.ww_rating_weeds_retry()}</button>
			</div>
		{:else if fetchClip && clipRoot}
			<div class="digging" aria-label={m.ww_rating_weeds_digging()}>
				<FrameClipPlayer root={clipRoot} clip={FETCH_CLIP} facts={fetchClip} loop />
			</div>
		{:else}
			<p class="note">{m.ww_rating_weeds_digging()}</p>
		{/if}
	</div>
</section>
</div>
</div>
<div class="run" aria-hidden="true" bind:this={runEl}></div>
</div>

<style>
	/* One step of page scroll per tab; the run below the pin is the other
	   N - 1 steps, so the pin holds for exactly that long. The nav above is
	   5rem and sticky, so the pin holds under it. */
	.weeds-track {
		--weeds-step: clamp(320px, 60vh, 640px);
		--stage-top: var(--host-chrome, 5rem);
		position: relative;
		z-index: 6;
		width: 100%;
		/* A new tab's table changes the stage's height; left to anchor on the
		   run below it, the browser would scroll the page by that growth, and
		   the scroll would read the next tab from it. */
		overflow-anchor: none;
	}

	/* The whole scene holds still while the scroll walks the tabs: the head,
	   the stage and whatever ground the host paints on the pin. It fills the
	   screen under the nav, so nothing behind it shows moving; a short screen
	   still gets the stage's 520px floor under the head. */
	.weeds-pin {
		position: sticky;
		top: var(--stage-top);
		height: max(calc(100dvh - var(--stage-top)), calc(var(--head-h) + 520px));
		display: flex;
		flex-direction: column;
	}

	.weeds-head {
		flex: none;
	}

	/* The page sets --stage-room when a tally stands beside the stage: the
	   stage gives it the column and leans only half that way, so it still
	   reads as the page's centre under the head. Which side is the page's
	   call; it flips these paddings to match. */
	.weeds-lean {
		flex: 1 1 0;
		min-height: 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding-right: var(--stage-room, 0px);
		padding-left: calc(var(--stage-room, 0px) / 2);
	}

	.run {
		height: calc((var(--weeds-n) - 1) * var(--weeds-step));
	}

	.weeds-stage {
		--card-max: 1180px;
		--tab-h: clamp(44px, 3.4vw, 56px);
		width: 100%;
		max-width: var(--card-max);
		/* The table takes what the pin leaves below the tabs and the bar, and
		   scrolls inside. */
		flex: 0 1 auto;
		min-height: 0;
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
	/* Never shrinks for a long table; the table scrolls instead. */
	.weeds-bar {
		container-type: inline-size;
		position: relative;
		flex: none;
		width: 100%;
		aspect-ratio: 685.4 / 49.1;
		min-height: 44px;
		margin: 0;
	}

	.bar-art {
		position: absolute;
		inset: 0;
	}

	.bar-art.phone {
		display: none;
	}

	.bar-art > :global(svg) {
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

	/* A phone keeps the count and the pill on one row; the pill's words wrap inside it. */
	.cue {
		flex: none;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 28px;
		margin-top: -4px;
	}

	/* Beside a phone, the cue costs no row: it rides in the band above the
	   strip, which the lit tab (1.5 x --tab-h, grown upward) never reaches. */
	@media (min-width: 768px) {
		.weeds-stage {
			position: relative;
			padding-top: max(calc(var(--tab-h) * 1.2), calc(var(--tab-h) * 0.5 + 36px));
		}

		.cue {
			position: absolute;
			top: 2px;
			right: clamp(16px, 3vw, 40px);
			margin: 0;
		}
	}

	.cue-count {
		flex: none;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-gold-shard);
		font-variant-numeric: tabular-nums;
	}

	.cue-next {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 28px;
		padding: 4px 12px 4px 10px;
		font: 700 14px var(--rt-font-web);
		color: var(--rtvr-on-dark);
		background: color-mix(in srgb, var(--rtvr-ink) 85%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-gold-shard) 55%, transparent);
		border-radius: 999px;
		cursor: pointer;
	}

	.cue-next:hover {
		border-color: var(--color-gold-shard);
	}

	.cue-next:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}

	.chev {
		width: 16px;
		height: 16px;
		flex: none;
		stroke: var(--color-gold-shard);
		fill: none;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: bob 1.4s ease-in-out infinite;
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(-2px);
		}
		50% {
			transform: translateY(3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chev {
			animation: none;
		}
	}

	/* A phone's pill takes the full 44px. */
	@media (max-width: 767px) {
		.cue-next {
			flex: 0 1 auto;
			min-width: 0;
			min-height: 44px;
			border-radius: 22px;
			font-size: 13px;
			line-height: 1.2;
			text-align: left;
		}
	}

	.panel {
		width: 100%;
		min-width: 0;
		min-height: calc(var(--tab-h) * 3);
		flex: 0 1 auto;
		display: flex;
		flex-direction: column;
	}

	.note {
		margin: 8px 0 0;
		color: color-mix(in srgb, var(--rtvr-on-dark) 65%, transparent);
		font-size: 14px;
	}

	/* Under the table: the count, then the empty slots, divided from the rows by a gold hairline. */
	.foot {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 22px;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid color-mix(in srgb, var(--color-gold-bar) 30%, transparent);
	}

	.count {
		margin: 0;
	}

	/* A tab with no table to show: one card in the measure sticker's dress, so the
	   state reads as an answer, not a leftover line. */
	.state {
		align-self: flex-start;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		max-width: min(100%, 640px);
		box-sizing: border-box;
		margin-top: 6px;
		padding: 14px 18px 16px;
		background: var(--rtvr-ink);
		border: 2px solid var(--color-gold-shard);
		border-radius: 3px;
		box-shadow: 2px 3px 6px rgb(12 8 1 / 0.4);
		--count-h: 30px;
	}

	.state-line {
		margin: 0;
		color: var(--rtvr-on-dark);
		font-family: var(--rt-font-web);
		font-size: 15px;
	}

	.retry {
		padding: 6px 14px;
		border: 1px solid var(--color-gold-bar);
		border-radius: 3px;
		background: transparent;
		color: var(--color-gold-bar);
		font: 600 13px var(--rt-font-web);
		letter-spacing: 0.04em;
		cursor: pointer;
	}

	.retry:hover {
		background: color-mix(in srgb, var(--color-gold-bar) 14%, transparent);
	}

	.retry:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}

	.from {
		flex: none;
		margin: 0 0 8px;
		color: var(--color-gold-bar);
		font-size: 13px;
		letter-spacing: 0.02em;
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

	/* Below 614px the wide art's own aspect would fall under the bar's 44px
	   floor. The phone art is drawn in px for exactly that height: its slanted
	   end is 44px of the left, its button the last 80px. */
	@container (max-width: 614px) {
		.bar-art.wide {
			display: none;
		}

		.bar-art.phone {
			display: block;
		}

		.bar-input {
			left: 44px;
			width: calc(100% - 124px);
		}

		.bar-clear {
			left: auto;
			right: 80px;
		}

		.bar-submit {
			left: auto;
			right: 0;
			width: 80px;
		}
	}
</style>
