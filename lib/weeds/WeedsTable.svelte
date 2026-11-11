<script lang="ts">
import { untrack } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import { deadOn, formatCell, isDrawn } from "./weedsFormat";
import { columnLabel } from "./columnLabels";
import { safeHref } from "./safeHref";
import { focusIndex } from "./weedsFocus";
import type { WeedsColumn, WeedsRow } from "../whoWhatTypes";

let {
	columns,
	rows,
	open = undefined,
}: {
	columns: WeedsColumn[];
	rows: WeedsRow[];
	/** The column whose cell opens the row, and what opening does. */
	open?: { column: string; on: (row: WeedsRow) => void };
} = $props();

const drawn = $derived(columns.filter(isDrawn));

let wrap = $state<HTMLDivElement>();
let table = $state<HTMLTableElement>();

// Laid-out boxes, read once per layout so a scroll frame does no DOM reads but the scroll position.
let rowBoxes: { top: number; h: number }[] = [];
let colBoxes: { left: number; w: number }[] = [];
let headH = $state(0);
let leadW = $state(0);
let tableW = $state(0);
let tableH = $state(0);

let activeRow = $state(0);
let activeCol = $state(-1);
let band = $state({ top: 0, h: 0 });
let colBand = $state({ left: 0, w: 0 });
let edge = $state({ left: false, right: false, bottom: false });

function measure() {
	if (!table) return;
	headH = table.tHead?.offsetHeight ?? 0;
	const head = table.tHead?.rows[0];
	colBoxes = head ? [...head.cells].map((c) => ({ left: c.offsetLeft, w: c.offsetWidth })) : [];
	leadW = colBoxes[0]?.w ?? 0;
	rowBoxes = table.tBodies[0] ? [...table.tBodies[0].rows].map((r) => ({ top: r.offsetTop, h: r.offsetHeight })) : [];
	tableW = table.offsetWidth;
	tableH = table.offsetHeight;
	// Re-place the bands on what is lit; only a scroll moves the cursor, or a resize would undo a hover.
	lightRow(activeRow);
	lightCol(activeCol);
	edges();
}

function lightRow(i: number) {
	activeRow = Math.min(Math.max(i, 0), rowBoxes.length - 1);
	const box = rowBoxes[activeRow];
	if (box) band = { top: box.top, h: box.h };
}

function lightCol(j: number) {
	activeCol = j;
	const box = colBoxes[j];
	if (box) colBand = { left: box.left, w: box.w };
}

function edges() {
	if (!wrap) return;
	const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = wrap;
	edge = {
		left: scrollLeft > 1,
		right: scrollLeft < scrollWidth - clientWidth - 1,
		bottom: scrollTop < scrollHeight - clientHeight - 1,
	};
}

/** The scroll position picks the lit row and column: a reading cursor that walks first to last as the table scrolls. */
function follow() {
	if (!wrap) return;
	const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = wrap;
	const maxY = scrollHeight - clientHeight;
	const maxX = scrollWidth - clientWidth;
	edges();
	if (maxY > 1) {
		lightRow(focusIndex(rowBoxes.map((b) => b.top), scrollTop + headH, clientHeight - headH, scrollTop / maxY));
	}
	if (maxX > 1) {
		const lefts = colBoxes.slice(1).map((b) => b.left);
		lightCol(1 + focusIndex(lefts, scrollLeft + leadW, clientWidth - leadW, scrollLeft / maxX));
	}
}

let frame = 0;
function onScroll() {
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		follow();
	});
}

function cellOf(target: EventTarget | null) {
	const cell = (target as Element | null)?.closest?.("td, th") as HTMLTableCellElement | null;
	const row = cell?.parentElement as HTMLTableRowElement | null;
	if (!cell || !row || row.parentElement?.tagName !== "TBODY") return null;
	return { i: row.rowIndex - 1, j: cell.cellIndex };
}

// Whichever moved last leads: the pointer, a tap, a focused link, or the scroll.
function point(e: PointerEvent | FocusEvent) {
	const at = cellOf(e.target);
	if (!at || (at.i === activeRow && at.j === activeCol)) return;
	lightRow(at.i);
	lightCol(at.j);
}

$effect(() => {
	if (!table) return;
	const seen = new ResizeObserver(() => measure());
	seen.observe(table);
	if (wrap) seen.observe(wrap);
	return () => {
		seen.disconnect();
		cancelAnimationFrame(frame);
	};
});

// A new table starts at its top-left; a narrowed filter keeps the reader where they are.
$effect(() => {
	void columns;
	wrap?.scrollTo({ top: 0, left: 0 });
	activeRow = 0;
	activeCol = -1;
});

// Untracked: measuring lights a row, and a lit row must not re-run the measure that undoes a hover.
$effect(() => {
	void rows;
	void drawn;
	untrack(measure);
});
</script>

<div class="weeds-frame" class:fade-left={edge.left} class:fade-right={edge.right} class:fade-bottom={edge.bottom}>
	<div
		class="weeds-table-wrap"
		bind:this={wrap}
		onscroll={onScroll}
		onpointermove={(e) => e.pointerType === "mouse" && point(e)}
		onpointerdown={point}
		onfocusin={point}
		style="--head-h: {headH}px; --lead-w: {leadW}px"
	>
		<div
			class="row-band"
			class:on={rows.length > 0}
			style="width: {tableW}px; height: {band.h}px; transform: translateY({band.top}px)"
		></div>
		<div
			class="col-band"
			class:on={activeCol > 0}
			style="height: {tableH}px; width: {colBand.w}px; transform: translateX({colBand.left}px)"
		></div>
		<table class="weeds-table" bind:this={table}>
			<thead>
				<tr>
					{#each drawn as c, j (c.key)}
						<th scope="col" class={c.kind} class:lit={j === activeCol && j > 0}>{columnLabel(c)}</th>
					{/each}
				</tr>
			</thead>
			{#key columns}
				<tbody>
					{#each rows as row, i (i)}
						<tr class:lit={i === activeRow} style="--i: {i}">
							{#each drawn as c, j (c.key)}
								{@const v = row[c.key]}
								{@const shown = formatCell(v, c.kind)}
								{@const dead = c.kind === "link" && v ? deadOn(row, columns) : null}
								{@const href = c.kind === "link" ? safeHref(v) : null}
								<td class={c.kind} class:cross={i === activeRow && j === activeCol && j > 0}>
									{#if dead}
										<span class="dead">{shown}</span>
										<small class="dead-note">{m.ww_rating_weeds_link_dead({ date: dead })}</small>
									{:else if href}
										<a {href} rel="noopener" target="_blank">{shown}</a>
									{:else if c.kind === "link" && v}
										{shown || String(v)}
									{:else if open && c.key === open.column && v}
										<button type="button" class="row-open" onclick={() => open.on(row)}>{shown}</button>
									{:else}
										{shown}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			{/key}
		</table>
	</div>
	<span class="fade left" aria-hidden="true"></span>
	<span class="fade right" aria-hidden="true"></span>
	<span class="fade bottom" aria-hidden="true"></span>
</div>

<style>
	/* The frame takes the wrapper's old place in the panel's column, so the
	   table still shrinks to the stage's cap; the fades sit on it, outside
	   the scroll, so they stay put while the rows move. */
	.weeds-frame {
		--glide: 260ms cubic-bezier(0.2, 0.9, 0.25, 1.12);
		--lit: color-mix(in srgb, var(--rt-yellow) 10%, #000);
		position: relative;
		width: 100%;
		max-width: 100%;
		flex: 0 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* Seven columns at 390px scroll sideways inside the wrapper, never the
	   page. Rows scroll inside it too, up to the stage's cap, and the wheel
	   chains to the page at the end: that is what walks the tabs, so the y
	   axis is never contained, and its snap is proximity, never mandatory. */
	.weeds-table-wrap {
		position: relative;
		isolation: isolate;
		width: 100%;
		max-width: 100%;
		flex: 0 1 auto;
		min-height: 0;
		overflow-x: auto;
		overflow-y: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: both proximity;
		scroll-padding-top: var(--head-h);
		scroll-padding-left: var(--lead-w);
		border: 3px solid var(--color-gold-bar);
		border-radius: 2px;
		background: #000;
	}

	/* Under the cells (z -1 in the wrapper's own stack), so text stays crisp
	   and the pinned header and lead column cover them. */
	.row-band,
	.col-band {
		position: absolute;
		top: 0;
		left: 0;
		z-index: -1;
		opacity: 0;
		pointer-events: none;
		transition:
			transform var(--glide),
			height var(--glide),
			width var(--glide),
			opacity 200ms ease-out;
	}

	.row-band {
		background: color-mix(in srgb, var(--rt-yellow) 9%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--rt-yellow) 35%, transparent),
			inset 0 -1px 0 color-mix(in srgb, var(--rt-yellow) 35%, transparent);
	}

	.col-band {
		background: color-mix(in srgb, var(--rt-yellow) 5%, transparent);
	}

	.row-band.on,
	.col-band.on {
		opacity: 1;
	}

	.weeds-table {
		border-collapse: collapse;
		min-width: 100%;
		font-family: var(--rt-font-web);
		font-size: 14px;
		line-height: 1.3;
		color: var(--rtvr-on-dark);
	}

	th,
	td {
		padding: 10px 12px;
		border: 1px solid #2e3342;
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
		max-width: 28rem;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			color 160ms ease-out,
			box-shadow 160ms ease-out,
			background-color 160ms ease-out;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 3;
		background: #000;
		color: var(--color-gold-bar);
		font-weight: 500;
		font-size: 13px;
		letter-spacing: 0.02em;
		scroll-snap-align: none start;
	}

	th.lit {
		color: var(--rt-yellow);
	}

	th::after {
		content: "";
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 4px;
		height: 2px;
		background: var(--rt-yellow);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--glide);
	}

	th.lit::after {
		transform: scaleX(1);
	}

	/* The project stays in view while the other columns slide under it. */
	th:first-child,
	td:first-child {
		position: sticky;
		left: 0;
		background: #000;
	}

	th:first-child {
		z-index: 4;
	}

	td:first-child {
		z-index: 1;
	}

	tbody tr {
		scroll-snap-align: start none;
		animation: weeds-row-in 340ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
		animation-delay: calc(min(var(--i), 16) * 22ms);
	}

	@keyframes weeds-row-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}

	tbody tr.lit td:first-child {
		background: var(--lit);
		box-shadow: inset 3px 0 0 var(--rt-yellow);
	}

	td.cross {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rt-yellow) 60%, transparent);
	}

	th.number,
	td.number,
	th.score,
	td.score {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	td.date {
		font-variant-numeric: tabular-nums;
	}

	a,
	.row-open {
		color: var(--color-gold-shard);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.dead-note {
		margin-left: 8px;
		font-size: 0.85em;
		opacity: 0.7;
	}

	.row-open {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		font: inherit;
		cursor: pointer;
	}

	a:hover,
	a:focus-visible,
	.row-open:hover,
	.row-open:focus-visible,
	tr.lit a,
	tr.lit .row-open {
		color: var(--color-gold-bar);
		outline: none;
	}

	.row-open:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 1px;
	}

	/* More table past this edge; inside the 3px border, the left one past the pinned column. */
	.fade {
		position: absolute;
		z-index: 1;
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
	}

	.fade.left {
		top: 3px;
		bottom: 3px;
		left: calc(3px + var(--lead-w, 0px));
		width: 24px;
		background: linear-gradient(to right, rgb(0 0 0 / 0.85), transparent);
	}

	.fade.right {
		top: 3px;
		bottom: 3px;
		right: 3px;
		width: 32px;
		background: linear-gradient(to left, #000, transparent);
	}

	.fade.bottom {
		left: 3px;
		right: 3px;
		bottom: 3px;
		height: 28px;
		background: linear-gradient(to top, #000, transparent);
	}

	.fade-left .fade.left,
	.fade-right .fade.right,
	.fade-bottom .fade.bottom {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.row-band,
		.col-band,
		th,
		td,
		th::after {
			transition: none;
		}

		tbody tr {
			animation: none;
		}
	}

	/* On a phone a cell's link or button fills the cell, 44px tall. */
	@media (max-width: 767px) {
		td:has(> a, > .row-open) {
			padding: 0;
		}

		td > a,
		td > .row-open {
			display: block;
			box-sizing: border-box;
			width: 100%;
			min-height: 44px;
			padding: 13px 12px;
			overflow: hidden;
			text-overflow: ellipsis;
			text-align: left;
		}

		td > .row-open:focus-visible,
		td > a:focus-visible {
			outline-offset: -2px;
		}
	}
</style>
