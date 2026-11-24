<script lang="ts">
// How the rating adds up, beside the reader's dig: a card at the window's left
// edge, or a strip along a phone's foot. Every figure is final from the first
// paint; only the line for the table in hand counts up, and the card takes its
// finished colour on the last table. Never a control.
import RatingNumber from "../rating/RatingNumber.svelte";
import {
	TABLE_LABELS,
	lineValue,
	placeLine,
	runningPoints,
	stackRows,
	tallyDone,
	tween,
	type AttributeCounts,
	type StackKey,
} from "./tallyMath";
import { fullCount, shortCount } from "./weedsFormat";
import type { ScoreTally } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

let {
	tally,
	litIndex,
	visible,
	landed = true,
	traceHref = undefined,
}: {
	tally: ScoreTally;
	litIndex: number;
	visible: boolean;
	/** False while the hero's number is still travelling into the card: its slot holds the hero's figure, unseen. */
	landed?: boolean;
	/** The page that walks this score down to its parts, linked once after the last table; absent, no link. */
	traceHref?: string;
} = $props();

const COUNT_MS = 750;

// An org's score was not broken down when it averaged nothing.
const brokenDown = $derived(tally.kind === "project" || (tally.org?.projects ?? 0) > 0);
const counts: AttributeCounts | null = null;
const rows = $derived(stackRows(tally, counts));
const place = $derived(placeLine(tally));
const done = $derived(brokenDown && tallyDone(tally, litIndex, landed));
const lit = $derived(tally.tables[litIndex] ?? tally.tables[0]);

// The lit line's count, 0–1; it restarts whenever another table lights.
let k = $state(1);
$effect(() => {
	void litIndex;
	if (!landed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		k = 1;
		return;
	}
	k = 0;
	const t0 = performance.now();
	let raf = 0;
	const tick = (now: number) => {
		const t = Math.min(1, (now - t0) / COUNT_MS);
		k = tween(0, 1, t);
		if (t < 1) raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(raf);
});

const one = (n: number) => n.toFixed(1);
const bigText = $derived(one(tally.rating ?? tally.score ?? 0));
const headline = $derived(
	new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(
		Number(bigText),
	),
);
const LABELS: Record<StackKey, () => string> = {
	possible: m.ww_rating_tally_possible,
	filled: m.ww_rating_tally_filled,
	share: m.ww_rating_tally_share,
	claim: m.ww_rating_tally_step_claims,
	place: () => place?.among ?? m.ww_rating_tally_peers(),
	rating: m.ww_rating_tally_rating,
};
const pair = (a: number, b: number) => `${fullCount(a)} / ${fullCount(b)}`;
const litValue = $derived(lineValue(lit, k));

// The strip's two lines: the table in hand, then the whole walk on one line.
const stripLine = $derived(
	!brokenDown
		? m.ww_rating_tally_not_broken_down()
		: typeof litValue === "string"
			? `${TABLE_LABELS[lit.table]} –`
			: `${TABLE_LABELS[lit.table]} ${shortCount(litValue.awarded)} / ${shortCount(litValue.available)}`,
);
const walk = $derived.by(() => {
	const v = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<StackKey, string>;
	const attributes = v.possible === "—" ? "—" : `${v.filled} / ${v.possible}`;
	return [attributes, v.share, v.claim, v.place, v.rating].filter((x) => x !== "—").join(" → ");
});

const status = $derived.by(() => {
	if (done && place) return m.ww_rating_tally_status_landed({ place: place.short, rating: one(tally.rating ?? 0) });
	const sums = runningPoints(tally, litIndex);
	return m.ww_rating_tally_status({
		table: TABLE_LABELS[lit.table],
		awarded: fullCount(lit.awarded),
		available: fullCount(lit.available),
		scored: fullCount(sums.scored),
		total: fullCount(sums.available),
	});
});
</script>

<p class="sr" role="status">{status}</p>

<aside class="tally corner" class:on={visible} class:waiting={!landed} class:done>
	<div class="face" aria-hidden="true">
		<p class="caption">{m.ww_rating_tally_adds_up({ rating: headline })}</p>
		<div class="big"><RatingNumber text={bigText} outOf={100} /></div>
		<ol class="stack">
			{#each rows as row (row.key)}
				<li class={row.key}><span class="label">{LABELS[row.key]()}</span><span class="fig">{row.value}</span></li>
			{/each}
		</ol>
		{#if brokenDown}
			<ol class="ladder">
				{#each tally.tables as line, t (line.table)}
					{@const value = lineValue(line, t === litIndex ? k : 1)}
					<li class:lit={t === litIndex}>
						<span class="name">{TABLE_LABELS[line.table]}</span>
						<span class="bar">{#if typeof value !== "string"}<span class="fill" style:transform="scaleX({value.fill})"></span>{/if}</span>
						{#if typeof value === "string"}
							<span class="pts">{value}</span>
						{:else}
							<span class="pts" title={pair(line.awarded, line.available)}>{shortCount(value.awarded)} / {shortCount(value.available)}</span>
						{/if}
					</li>
				{/each}
			</ol>
		{:else}
			<p class="note">{m.ww_rating_tally_not_broken_down_long()}</p>
		{/if}
	</div>
</aside>

<div class="tally strip" class:on={visible} class:waiting={!landed} class:done>
	<div class="face" aria-hidden="true">
		<span class="pct"><RatingNumber text={bigText} /></span>
		<span class="what">{stripLine}</span>
		<span class="walk">{walk}</span>
	</div>
</div>

{#if traceHref}<p class="trace-end"><a href={traceHref}>{m.ww_rating_trace_link()}</a></p>{/if}

<style>
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Above the weeds track, under the site's nav; fades both ways and is
	   never hit-testable, hidden outright once faded. */
	.tally {
		position: fixed;
		z-index: 20;
		pointer-events: none;
		font-family: var(--rt-font-web);
		color: var(--rt-cream-dim);
		font-variant-numeric: tabular-nums;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 260ms ease,
			visibility 0s linear 260ms,
			border-color 500ms ease;
	}

	.tally.on {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 260ms ease,
			visibility 0s,
			border-color 500ms ease;
	}

	/* Finished: the last table's line counts in, then the gold turns. */
	.tally.done {
		--tally-mark: var(--rt-sage);
	}

	.tally.on.done {
		transition:
			opacity 260ms ease,
			visibility 0s,
			border-color 500ms ease 750ms;
	}

	/* The page's sticker dress: ink, a gold edge, a slight tilt. The page sets its top under the pinned head. */
	.corner {
		--tally-mark: var(--color-gold-shard);
		display: none;
		left: clamp(20px, 2.4vw, 40px);
		top: var(--ledger-top, 25vh);
		width: 286px;
		max-height: calc(100vh - var(--ledger-top, 25vh) - 16px);
		box-sizing: border-box;
		flex-direction: column;
		gap: 12px;
		padding: 16px 18px 14px;
		background: var(--rtvr-ink);
		border: 2px solid var(--tally-mark);
		border-radius: 3px;
		box-shadow: 3px 5px 14px rgb(0 0 0 / 0.5);
		transform: rotate(-0.8deg);
		overflow: hidden;
	}

	.corner p {
		margin: 0;
	}

	/* The figures are drawn for the eye (the status line speaks them) and lay out as the card's own children. */
	.face {
		display: contents;
	}

	.caption {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-gold-bar);
	}

	.big {
		--glyph-h: 58px;
		min-height: 58px;
		display: flex;
		align-items: flex-end;
	}

	/* Dim while the hero's number is on its way; its own slot stays empty till it lands. */
	.tally.corner.on.waiting {
		opacity: 0.25;
	}

	.corner.waiting .big {
		visibility: hidden;
	}

	/* The six figures, at the size of the "/100" beside the rating. */
	.stack {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 5px;
	}

	.stack li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		min-width: 0;
	}

	.stack .label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		color: var(--rtvr-on-dark);
	}

	.stack .fig {
		flex: 0 0 auto;
		font-size: 19px;
		font-weight: 700;
		line-height: 1.1;
		color: var(--tally-mark);
		transition: color 500ms ease;
	}

	.done .fig,
	.done .walk,
	.done .fill {
		transition-delay: 750ms;
	}

	.stack li.rating {
		margin-top: 2px;
		padding-top: 6px;
		border-top: 1px solid color-mix(in srgb, var(--tally-mark) 45%, transparent);
	}

	.ladder {
		list-style: none;
		margin: 0;
		padding: 10px 0 0;
		border-top: 1px solid color-mix(in srgb, var(--color-gold-bar) 30%, transparent);
		display: grid;
		gap: 3px;
		font-size: 12.5px;
	}

	.ladder li {
		display: grid;
		grid-template-columns: 6.6em minmax(0, 1fr) auto;
		align-items: center;
		gap: 6px;
		color: var(--rt-cream);
	}

	.ladder .name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ladder li.lit {
		color: var(--rtvr-on-dark);
		font-weight: 700;
	}

	.ladder li.lit .name::before {
		content: "";
		display: inline-block;
		width: 6px;
		height: 6px;
		margin: 0 5px 1px 0;
		border-radius: 50%;
		background: var(--color-gold-shard);
	}

	.bar {
		height: 5px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-gold-shard) 18%, transparent);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--tally-mark);
		transform-origin: 0 50%;
		transition: background-color 500ms ease;
	}

	.pts {
		min-width: 4.6em;
		text-align: right;
		white-space: nowrap;
	}

	.note {
		font-size: 13px;
	}

	/* The phone strip: the rating, the table in hand, and the walk to the rating on one line. */
	.strip {
		--tally-mark: var(--color-gold-shard);
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-rows: auto auto;
		align-items: center;
		gap: 2px 12px;
		box-sizing: border-box;
		padding: 7px max(16px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px))
			max(16px, env(safe-area-inset-left, 0px));
		background: var(--rtvr-ink);
		border-top: 2px solid var(--tally-mark);
		font-size: 12.5px;
	}

	.pct {
		--glyph-h: 30px;
		grid-row: 1 / 3;
		filter: none;
	}

	/* Empty while the hero's number is on its way into it. */
	.strip.waiting .pct {
		visibility: hidden;
	}

	.what,
	.walk {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.what {
		color: var(--rtvr-on-dark);
	}

	.walk {
		font-weight: 700;
		color: var(--tally-mark);
		transition: color 500ms ease;
	}

	/* The way down to the score's parts, once the last table is behind the reader. */
	.trace-end {
		position: relative;
		z-index: 6;
		margin: 0;
		padding: 28px 16px 36px;
		text-align: center;
		font-family: var(--rt-font-web);
	}

	.trace-end a {
		color: var(--color-gold-bar);
		font-size: 16px;
		font-weight: 700;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-gold-bar) 55%, transparent);
		text-underline-offset: 3px;
	}

	.trace-end a:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 3px;
	}

	@media (min-width: 1100px) {
		.corner {
			display: flex;
		}

		.strip {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tally,
		.tally.on,
		.tally.on.done,
		.fig,
		.fill,
		.walk {
			transition: none;
		}
	}
</style>
