<script lang="ts">
// The weeds under the rating: the tab strip, the weeds bar and one table per
// tab. Each table is fetched once and kept; the bar narrows the rows it has.
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { loadClips, type ClipManifest } from "$gc/frameClips";
import WeedsBarArt from "./ratingAssets/Rating_page_weeds_search_bar.svg?raw";
import WeedsTable from "./WeedsTable.svelte";
import WeedsTabs from "./WeedsTabs.svelte";
import { filterRows } from "./weedsFormat";
import type { WeedsAnswer, WeedsRow, WeedsTable as WeedsTableName } from "./whoWhatTypes";

let {
	tab,
	href,
	clipRoot = undefined,
	onopenproject = undefined,
}: {
	tab: "orgs" | "projects";
	/** The host's URL for one table of this record. */
	href: (table: WeedsTableName) => string;
	clipRoot?: string;
	/** An org's Projects row picked; absent, the names are plain text. */
	onopenproject?: (projectKey: string) => void;
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
		console.error("weeds: could not load", cause);
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

// The first tab fills itself once the hero has painted, like the dropdown lists.
$effect(() => {
	const idle = window.requestIdleCallback?.(() => load("projects"), { timeout: 2000 });
	const timer = idle === undefined ? setTimeout(() => load("projects"), 200) : undefined;
	return () => {
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

<section class="weeds-section" aria-label="The weeds">
	<WeedsTabs {active} onselect={select} panelId={PANEL_ID} />

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
					{#if query}{rows.length} of {answer.rows.length} rows{:else if answer.total > answer.rows.length}First {answer.rows.length} of {answer.total} rows{:else}{answer.rows.length} rows{/if}
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

<style>
	.weeds-section {
		--card-max: 1180px;
		--tab-h: clamp(44px, 3.4vw, 56px);
		position: relative;
		z-index: 6;
		width: 100%;
		max-width: var(--card-max);
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
		.weeds-section {
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
