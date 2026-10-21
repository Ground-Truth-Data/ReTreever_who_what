<script lang="ts">
// The list under a search bar: the rows, their order, the keyboard highlight
// and the dismissals. Owned once here, shown under the search page's bar and
// the rating page's alike — the bar itself is only chrome and an input.
import FrameClipPlayer from "$gc/FrameClipPlayer.svelte";
import { frameUrls, loadClips, type ClipFacts } from "$gc/frameClips";
import WindowRaw from "../assets/svg/rating/Rating_page_search_dropdown.svg?raw";
import { WINDOW_BOX, windowBorderCss, windowSliceCss } from "./dropWindow";
import type { SearchListItem } from "./searchTypes";

let {
	items = [],
	query = "",
	open = $bindable(false),
	listLoading = false,
	noun = "results",
	listId,
	hrefOf = () => undefined,
	within = null,
	activeDescendant = $bindable(undefined),
	clipRoot = undefined,
	onpick,
}: {
	items?: SearchListItem[];
	query?: string;
	open?: boolean;
	listLoading?: boolean;
	noun?: string;
	listId: string;
	/** A row with a link is a link; without, a button that only fills the bar. */
	hrefOf?: (item: SearchListItem) => string | undefined;
	/** The bar and list together: a pointer down outside closes the list. */
	within?: HTMLElement | null;
	/** The highlighted row's id, for the input's aria-activedescendant. */
	activeDescendant?: string | undefined;
	/** Where the frame clips are served from; absent, loading is the plain text. */
	clipRoot?: string;
	/** `go` false: a modified click, the row's own link navigates. */
	onpick?: (item: SearchListItem, go: boolean) => void;
} = $props();

const searchIndex = $derived(items.map((item) => ({ item, hay: item.name.toLowerCase() })));

const MAX_ROWS = 50;
const TOP_ROWS = 5;
const filtered = $derived.by(() => {
	const q = query.trim().toLowerCase();
	if (q) {
		const matches = searchIndex.filter((e) => e.hay.includes(q));
		return { total: matches.length, rows: matches.slice(0, MAX_ROWS).map((e) => e.item) };
	}
	return { total: items.length, rows: items.slice(0, TOP_ROWS) };
});

let highlighted = $state(-1);
const rowId = (i: number) => `${listId}-row-${i}`;

$effect(() => {
	filtered.rows;
	open;
	highlighted = -1;
});

$effect(() => {
	activeDescendant = open && highlighted >= 0 ? rowId(highlighted) : undefined;
});

/** Arrow keys walk the rows while focus stays in the input. */
export function move(dir: 1 | -1) {
	const n = filtered.rows.length;
	if (n === 0) return;
	highlighted = Math.min(n - 1, Math.max(-1, highlighted + dir));
	if (highlighted >= 0) document.getElementById(rowId(highlighted))?.scrollIntoView({ block: "nearest" });
}

/** The row Enter would take: the highlighted one, else the first; null when the list is closed or empty. */
export function current(): SearchListItem | null {
	if (!open || filtered.rows.length === 0) return null;
	return filtered.rows[Math.max(0, highlighted)];
}

function pickRow(e: MouseEvent, item: SearchListItem) {
	const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
	if (!modified) e.preventDefault();
	onpick?.(item, !modified);
}

function dismissOnOutside(e: PointerEvent) {
	if (open && within && !within.contains(e.target as Node)) open = false;
}

function dismissOnEscape(e: KeyboardEvent) {
	if (open && e.key === "Escape") {
		open = false;
		e.preventDefault();
	}
}

const WINDOW_ART = `url("data:image/svg+xml,${encodeURIComponent(WindowRaw)}")`;
const WINDOW_SLICE = windowSliceCss();
const WINDOW_BORDER = windowBorderCss("var(--u)");

const FETCH_CLIP = "fetch-search";
let fetchClip = $state<ClipFacts | null>(null);

// Loaded and preloaded on mount, so the first open plays at speed.
$effect(() => {
	if (!clipRoot) return;
	let live = true;
	loadClips(clipRoot).then((m) => {
		if (!live) return;
		fetchClip = m.clips[FETCH_CLIP] ?? null;
		if (fetchClip) {
			for (const u of frameUrls(clipRoot, FETCH_CLIP, fetchClip)) {
				const img = new Image();
				img.src = u;
			}
		}
	});
	return () => {
		live = false;
	};
});
</script>

<svelte:window onpointerdown={dismissOnOutside} onkeydown={dismissOnEscape} />

{#if open}
	<div class="drop-window">
		<ul
			class="search-dropdown"
			id={listId}
			role="listbox"
			aria-busy={listLoading}
			style:--win-w={WINDOW_BOX.w}
			style:--win-art={WINDOW_ART}
			style:--win-slice={WINDOW_SLICE}
			style:--win-border={WINDOW_BORDER}
		>
			{#each filtered.rows as item, i (item.key)}
				{@const href = hrefOf(item)}
				{#snippet rowBody()}
					<span class="row-name">{item.name}</span>
					{#if item.hint}
						<span class="row-hint">{item.hint}</span>
					{/if}
				{/snippet}
				<li id={rowId(i)} role="option" aria-selected={i === highlighted}>
					{#if href}
						<a {href} class="dropdown-row" class:highlighted={i === highlighted} tabindex="-1" onclick={(e) => pickRow(e, item)}>
							{@render rowBody()}
						</a>
					{:else}
						<button type="button" class="dropdown-row" class:highlighted={i === highlighted} tabindex="-1" onclick={() => onpick?.(item, true)}>
							{@render rowBody()}
						</button>
					{/if}
				</li>
			{:else}
				<li class="dropdown-empty" role="presentation">
					{#if listLoading && clipRoot && fetchClip}
						<span class="fetch-stage" aria-hidden="true" style:--clip-w="{fetchClip.widthRem}rem">
							<FrameClipPlayer root={clipRoot} clip={FETCH_CLIP} facts={fetchClip} loop />
						</span>
						<span class="visually-hidden">Loading {noun}…</span>
					{:else if listLoading}
						Loading {noun}…
					{:else}
						No {noun}
						{query.trim() ? "match" : "loaded"}
					{/if}
				</li>
			{/each}
			{#if filtered.total > filtered.rows.length}
				<li class="dropdown-more" role="presentation">
					Showing {filtered.rows.length} of {filtered.total} — keep typing to narrow
				</li>
			{/if}
		</ul>
	</div>
{/if}

<style>
	/* The container gives the list `cqw`, so every size below is a share of the
	   bar's width — the window's viewBox unit — whatever the list's height. */
	.drop-window {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 6;
		container-type: inline-size;
	}

	/* Nine-slice of the drawn window: corners keep the designer's skew, the
	   straight runs stretch to the rows. `fill` paints the black panel. The
	   inline vars sit here, not on the container: a var() resolves where it is
	   declared, and `--u` only exists on this element. */
	.search-dropdown {
		--u: calc(100cqw / var(--win-w));
		--row-x: max(8px, calc(3.5 * var(--u)));
		--row-y: max(7px, calc(2.6 * var(--u)));
		box-sizing: border-box;
		width: 100%;
		max-height: min(40vh, 320px);
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
		background: #000;
		border-style: solid;
		border-width: var(--win-border);
		border-image: var(--win-art) var(--win-slice) fill;
	}

	.dropdown-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: calc(5 * var(--u));
		width: 100%;
		padding: var(--row-y) var(--row-x);
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
		left: var(--row-x);
		right: var(--row-x);
		height: 1px;
		background: #2e3342;
	}

	/* Type in the window's units, floored where it would fall under 12px. */
	.row-name {
		color: var(--rtvr-on-dark);
		font-size: max(12px, calc(10 * var(--u)));
		line-height: 1.3;
	}

	.row-hint {
		color: #8d93a6;
		font-size: max(11px, calc(8 * var(--u)));
		flex-shrink: 0;
	}

	.dropdown-empty {
		padding: var(--row-y) var(--row-x);
		color: #8d93a6;
		font-size: max(12px, calc(9 * var(--u)));
	}

	/* The dog crosses the middle of its 2732x2048 frame; the stage shows that
	   window (x 640-2000, y 520-1320) at the clip's declared width. */
	.fetch-stage {
		--crop-x: 640;
		--crop-y: 520;
		--crop-w: 1360;
		--crop-h: 800;
		position: relative;
		display: block;
		width: calc(var(--clip-w) * var(--crop-w) / 2732);
		max-width: 100%;
		aspect-ratio: 1360 / 800;
		margin: 0 auto;
		overflow: hidden;
	}

	.fetch-stage :global(.frame-clip) {
		position: absolute;
		width: calc(100% * 2732 / var(--crop-w)) !important;
		max-width: none;
		left: calc(-100% * var(--crop-x) / var(--crop-w));
		top: calc(-100% * var(--crop-y) / var(--crop-h));
	}

	.dropdown-more {
		padding: var(--row-y) var(--row-x);
		color: #8d93a6;
		font-size: max(11px, calc(8 * var(--u)));
		font-style: italic;
		border-top: 1px solid rgba(141, 147, 166, 0.2);
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
</style>
