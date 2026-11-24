<script lang="ts">
// One weeds table as the host worked it out: a row per attribute the method
// offers, its first value and the points it earns, every number final from
// the first paint. Only the row under the scroll line counts its points up.
import { untrack } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import CountUp from "../trace/CountUp.svelte";
import { attributeLabel } from "./columnLabels";
import { attributeText, EMPTY, fullCount } from "./weedsFormat";
import { focusIndex } from "./weedsFocus";
import { rowAt } from "./weedsScroll";
import { safeHref } from "./safeHref";
import type { WeedsAttribute } from "../whoWhatTypes";

let {
	attributes,
	line = null,
	sweep = undefined,
}: {
	attributes: WeedsAttribute[];
	/** Where the page's scroll line is through this table, 0 to 1; null while the reader is not in the weeds. */
	line?: number | null;
	/** A new value is a new table: it opens at its top and its rows count again. */
	sweep?: unknown;
} = $props();

let wrap = $state<HTMLDivElement>();
let table = $state<HTMLTableElement>();
let rowBoxes: { top: number; h: number }[] = [];
let headH = $state(0);
let tableW = $state(0);
let active = $state(-1);
let band = $state({ top: 0, h: 0 });
let edge = $state({ bottom: false });
// A scroll this table made itself, to keep the active row in view, is not the reader's.
let ownScrollUntil = 0;

function measure() {
	if (!table) return;
	headH = table.tHead?.offsetHeight ?? 0;
	rowBoxes = table.tBodies[0] ? [...table.tBodies[0].rows].map((r) => ({ top: r.offsetTop, h: r.offsetHeight })) : [];
	tableW = table.offsetWidth;
	place();
	edges();
}

function place() {
	const box = rowBoxes[active];
	if (box) band = { top: box.top, h: box.h };
}

function edges() {
	if (!wrap) return;
	edge = { bottom: wrap.scrollTop < wrap.scrollHeight - wrap.clientHeight - 1 };
}

function activate(i: number, reveal: boolean) {
	active = i;
	place();
	const box = rowBoxes[i];
	if (!reveal || !box || !wrap) return;
	const view = wrap.clientHeight - headH;
	const top = wrap.scrollTop;
	if (box.top - headH >= top && box.top + box.h <= top + headH + view) return;
	ownScrollUntil = performance.now() + 120;
	wrap.scrollTop = Math.max(0, box.top - headH - (view - box.h) / 2);
}

// The page's scroll line leads: as it walks down the tab, it walks down the rows.
$effect(() => {
	if (line === null) return;
	const i = rowAt(line, attributes.length);
	untrack(() => {
		if (i !== active) activate(i, true);
	});
});

// The reader scrolling the table itself moves the line too.
let frame = 0;
function onScroll() {
	edges();
	if (performance.now() < ownScrollUntil || frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		if (!wrap) return;
		const max = wrap.scrollHeight - wrap.clientHeight;
		if (max > 1) activate(focusIndex(rowBoxes.map((b) => b.top), wrap.scrollTop + headH, wrap.clientHeight - headH, wrap.scrollTop / max), false);
	});
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

$effect(() => {
	void attributes;
	untrack(measure);
});

// A new table opens at its top, its active row wherever the line already is.
$effect(() => {
	void sweep;
	untrack(() => {
		wrap?.scrollTo({ top: 0, left: 0 });
		active = -1;
		measure();
		if (line !== null) activate(rowAt(line, attributes.length), true);
	});
});

const pointsLabel = (a: WeedsAttribute) =>
	m.ww_rating_weeds_points_of({ scored: fullCount(a.pointsAwarded ?? 0), available: fullCount(a.pointsAvailable ?? 0) });
</script>

<div class="weeds-frame" class:fade-bottom={edge.bottom}>
	<div class="weeds-table-wrap" bind:this={wrap} onscroll={onScroll} style="--head-h: {headH}px">
		<div class="row-band" class:on={active >= 0} style="width: {tableW}px; height: {band.h}px; transform: translateY({band.top}px)"></div>
		<table class="weeds-table" bind:this={table}>
			<thead>
				<tr>
					<th scope="col">{m.ww_rating_weeds_col_attribute()}</th>
					<th scope="col">{m.ww_rating_weeds_col_value()}</th>
					<th scope="col" class="points">{m.ww_rating_column_points()}</th>
				</tr>
			</thead>
			{#key sweep}
				<tbody>
					{#each attributes as a, i (a.field)}
						{@const href = a.kind === "link" ? safeHref(a.example) : null}
						<tr class:active={i === active} class:unfilled={a.filled === 0} data-field={a.field}>
							<th scope="row" class="name">{attributeLabel(a)}</th>
							<td class="value {a.kind}">
								<span class="shown">
									{#if a.withheld && a.filled > 0}
										<span class="withheld">{m.ww_rating_weeds_withheld()}</span>
									{:else if href}
										<a {href} rel="noopener" target="_blank">{attributeText(a)}</a>
									{:else if a.kind === "names" && Array.isArray(a.example)}
										{#each a.example as s, k (k)}{k ? ", " : ""}{s.name}{#if s.scientific}<small class="sci">{s.scientific}</small>{/if}{/each}
									{:else}
										{attributeText(a)}
									{/if}
								</span>
								{#if a.records > 0}
									<small class="share">{m.ww_rating_weeds_filled_of({ filled: fullCount(a.filled), records: fullCount(a.records) })}</small>
								{/if}
							</td>
							<td class="points">
								{#if a.pointsAwarded === null || a.pointsAvailable === null}
									{EMPTY}
								{:else}
									<span class="earned"><CountUp value={a.pointsAwarded} format={fullCount} run={i === active} label={pointsLabel(a)} /></span>
									<span class="of" aria-hidden="true">/ {fullCount(a.pointsAvailable)}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			{/key}
		</table>
	</div>
	<span class="fade bottom" aria-hidden="true"></span>
</div>

<style>
	.weeds-frame {
		--glide: 260ms cubic-bezier(0.2, 0.9, 0.25, 1.12);
		position: relative;
		width: 100%;
		max-width: 100%;
		flex: 0 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* Rows scroll inside the wrapper up to the stage's cap; the wheel chains
	   to the page at the end, which is what walks the tabs. */
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
		border: 3px solid var(--color-gold-bar);
		border-radius: 2px;
		background: #000;
	}

	/* Under the cells, so the text stays crisp and the pinned header covers it. */
	.row-band {
		position: absolute;
		top: 0;
		left: 0;
		z-index: -1;
		opacity: 0;
		pointer-events: none;
		background: color-mix(in srgb, var(--rt-yellow) 9%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--rt-yellow) 35%, transparent),
			inset 0 -1px 0 color-mix(in srgb, var(--rt-yellow) 35%, transparent);
		transition:
			transform var(--glide),
			height var(--glide),
			opacity 200ms ease-out;
	}

	.row-band.on {
		opacity: 1;
	}

	.weeds-table {
		border-collapse: collapse;
		width: 100%;
		table-layout: fixed;
		font-family: var(--rt-font-web);
		font-size: 14px;
		line-height: 1.3;
		color: var(--rtvr-on-dark);
	}

	th,
	td {
		padding: 8px 12px;
		border: 1px solid color-mix(in srgb, var(--rtvr-on-dark) 16%, transparent);
		text-align: left;
		vertical-align: middle;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 3;
		background: #000;
		color: var(--color-gold-bar);
		font-weight: 500;
		font-size: 13px;
		letter-spacing: 0.02em;
	}

	thead th:first-child {
		width: 32%;
	}

	thead th.points {
		width: 9.5rem;
		text-align: right;
	}

	.name {
		font-weight: 500;
		color: var(--rtvr-on-dark);
		overflow-wrap: anywhere;
	}

	/* A long description reads two lines and ends in an ellipsis; the count under it always shows. */
	.shown {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		overflow-wrap: anywhere;
	}

	.share {
		display: block;
		margin-top: 2px;
		color: color-mix(in srgb, var(--rtvr-on-dark) 58%, transparent);
		font-size: 12px;
	}

	.withheld {
		color: color-mix(in srgb, var(--rtvr-on-dark) 58%, transparent);
		font-style: italic;
	}

	td.number,
	td.money,
	td.date {
		font-variant-numeric: tabular-nums;
	}

	/* The earned figure and its "of" wrap apart when the column is narrow, never out of it. */
	td.points {
		--glyph-h: 20px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.earned {
		display: inline-flex;
		vertical-align: bottom;
	}

	.of {
		display: inline-block;
		white-space: nowrap;
		margin-left: 4px;
		color: color-mix(in srgb, var(--rtvr-on-dark) 58%, transparent);
		font-size: 13px;
	}

	.unfilled .name,
	.unfilled .shown {
		color: color-mix(in srgb, var(--rtvr-on-dark) 58%, transparent);
	}

	tr.active .name {
		color: var(--rt-yellow);
		box-shadow: inset 3px 0 0 var(--rt-yellow);
	}

	.sci {
		margin-left: 0.3em;
		font-size: var(--rt-fs-meta);
	}

	a {
		color: var(--color-gold-shard);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:hover,
	a:focus-visible {
		color: var(--color-gold-bar);
	}

	a:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 1px;
	}

	.fade {
		position: absolute;
		z-index: 1;
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
	}

	.fade.bottom {
		left: 3px;
		right: 3px;
		bottom: 3px;
		height: 28px;
		background: linear-gradient(to top, #000, transparent);
	}

	.fade-bottom .fade.bottom {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.row-band {
			transition: none;
		}
	}

	@media (max-width: 767px) {
		th,
		td {
			padding: 8px;
		}

		thead th:first-child {
			width: 36%;
		}

		thead th.points {
			width: 7.5rem;
		}
	}
</style>
