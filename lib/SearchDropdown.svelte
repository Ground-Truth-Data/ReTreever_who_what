<script lang="ts">
// The list under a search bar: the rows, their order, the keyboard highlight
// and the dismissals. Owned once here, shown under the search page's bar and
// the rating page's alike — the bar itself is only chrome and an input.
import type { SearchListItem } from "./searchTypes";

let {
	items = [],
	topKeys = [],
	query = "",
	open = $bindable(false),
	listLoading = false,
	noun = "results",
	listId,
	hrefOf = () => undefined,
	within = null,
	activeDescendant = $bindable(undefined),
	onpick,
}: {
	items?: SearchListItem[];
	/** Most-searched keys, shown first while the query is empty. */
	topKeys?: string[];
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
	const byKey = new Map(items.map((item) => [item.key, item]));
	const top = topKeys
		.map((k) => byKey.get(k))
		.filter((item): item is SearchListItem => item !== undefined);
	const seen = new Set(top.map((item) => item.key));
	const fill = items.filter((item) => !seen.has(item.key));
	return { total: items.length, rows: [...top, ...fill].slice(0, TOP_ROWS) };
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
</script>

<svelte:window onpointerdown={dismissOnOutside} onkeydown={dismissOnEscape} />

<!-- TODO: swap the chrome for the design's drop-window SVG once exported; keep the list. -->
{#if open}
	<ul class="search-dropdown" id={listId} role="listbox">
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
				{#if listLoading}
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
{/if}

<style>
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
</style>
