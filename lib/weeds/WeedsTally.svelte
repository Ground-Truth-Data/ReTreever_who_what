<script lang="ts">
// The rating adding up while the reader digs: a panel at the window's left
// edge, or a thin strip on a phone. Never a control.
import { untrack } from "svelte";
import RatingNumber from "../rating/RatingNumber.svelte";
import { TABLE_LABELS, TABLE_SCORES, barFill, ladderValue, tallyTargets, tween } from "./tallyMath";
import { fullCount, shortCount } from "./weedsFormat";
import { WEEDS_TABLES, type ScoreTally } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

let {
	tally,
	litIndex,
	visible,
	landed = true,
}: {
	tally: ScoreTally;
	litIndex: number;
	visible: boolean;
	/** False while the hero's number is still travelling into the panel: its slot holds the hero's figure, unseen. */
	landed?: boolean;
} = $props();

const LAST = WEEDS_TABLES.length - 1;
const COUNT_MS = 750;

const lit = $derived(tally.tables[litIndex] ?? tally.tables[0]);
const goal = $derived(tallyTargets(tally, litIndex));
// An org's score was not broken down when it averaged nothing.
const brokenDown = $derived(tally.kind === "project" || (tally.org?.projects ?? 0) > 0);

let shown = $state({ scored: 0, available: 0, big: 0 });
let wasLanded = false;
$effect(() => {
	const to = { ...goal };
	if (!landed) {
		shown = { scored: 0, available: 0, big: tally.rating ?? 0 };
		wasLanded = false;
		return;
	}
	// The landing number drops to 0 and counts up, so the reader sees the tables build it.
	const from = wasLanded ? untrack(() => ({ ...shown })) : { scored: 0, available: 0, big: 0 };
	wasLanded = true;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		shown = to;
		return;
	}
	const t0 = performance.now();
	let raf = 0;
	const tick = (now: number) => {
		const t = Math.min(1, (now - t0) / COUNT_MS);
		shown = { scored: tween(from.scored, to.scored, t), available: tween(from.available, to.available, t), big: tween(from.big, to.big, t) };
		if (t < 1) raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(raf);
});

// Whole points: compact from five digits, the full figure in the title and the accessible name.
const pair = (a: number, b: number) => `${fullCount(a)} / ${fullCount(b)}`;
const bigText = $derived(shown.big.toFixed(1));
const scoreText = $derived((tally.score ?? 0).toFixed(1));
const scoreWords = $derived(
	new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(Number(scoreText)),
);
const label = $derived(TABLE_LABELS[lit.table]);
const status = $derived(
	m.ww_rating_tally_status({
		table: label,
		awarded: fullCount(lit.awarded),
		available: fullCount(lit.available),
		scored: fullCount(goal.scored),
		total: fullCount(goal.available),
	}),
);
</script>

<p class="sr" role="status">{status}</p>

<aside class="tally corner" class:on={visible} class:waiting={!landed} aria-hidden="true">
	<p class="caption">{m.ww_rating_tally_caption({ rating: scoreWords })}</p>
	<div class="big"><RatingNumber text={bigText} /></div>
	{#if brokenDown}
		<p class="so-far" title={pair(shown.scored, shown.available)}>
			<span class="pts"><RatingNumber text={shortCount(shown.scored)} label={fullCount(shown.scored)} /></span>
			<span>{m.ww_rating_tally_points_so_far({ available: shortCount(shown.available) })}</span>
		</p>
		<ol class="ladder">
			{#each tally.tables as line, i (line.table)}
				{@const value = ladderValue(line, i, litIndex)}
				{@const fill = barFill(line, i, landed ? litIndex : -1)}
				<li class:dim={i > litIndex} class:lit={i === litIndex}>
					<span class="name">{TABLE_LABELS[line.table]}</span>
					{#if typeof value === "string"}
						<span class="value"><span class="mark">{value}</span></span>
					{:else}
						<span class="value" title={pair(value.awarded, value.available)}>
							<RatingNumber text={shortCount(value.awarded)} label={fullCount(value.awarded)} /><span class="slash">/</span><RatingNumber
								text={shortCount(value.available)}
								label={fullCount(value.available)}
							/>
						</span>
					{/if}
					{#if fill !== null}
						<span class="bar"><span class="fill" style:transform="scaleX({fill})"></span></span>
					{/if}
				</li>
			{/each}
			{#if tally.kind === "org" && tally.org}
				<li class="org" class:dim={litIndex < LAST} class:lit={litIndex === LAST}>
					<span class="name">{m.ww_rating_tally_mean({ count: tally.org.projects, shown: fullCount(tally.org.projects) })}</span>
					<span class="value"><RatingNumber text={(tally.org.mean ?? 0).toFixed(1)} /></span>
				</li>
				<li class:dim={litIndex < LAST} class:lit={litIndex === LAST}>
					<span class="name">{m.ww_rating_tally_after_claims()}</span>
					<span class="value"><RatingNumber text={scoreText} /></span>
				</li>
			{/if}
		</ol>
		<p class="scores">{m.ww_rating_tally_table_scores({ table: label, scores: TABLE_SCORES[lit.table] })}</p>
	{:else}
		<p class="scores">{m.ww_rating_tally_not_broken_down_long()}</p>
	{/if}
</aside>

<div class="tally strip" class:on={visible} aria-hidden="true">
	<ol class="steps">
		{#each tally.tables as line, i (line.table)}
			<li class:done={i < litIndex} class:lit={i === litIndex}></li>
		{/each}
	</ol>
	<span class="pct"><RatingNumber text={bigText} /></span>
	{#if brokenDown}
		<span class="row-pts" title={pair(shown.scored, shown.available)}>{m.ww_rating_tally_of({ scored: shortCount(shown.scored), total: shortCount(shown.available) })}</span>
		<span class="row-lit" title={pair(lit.awarded, lit.available)}><span class="name">{label}</span> {shortCount(lit.awarded)}/{shortCount(lit.available)}</span>
	{:else}
		<span class="row-pts">{m.ww_rating_tally_not_broken_down()}</span>
	{/if}
</div>

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
		color: var(--rtvr-on-dark, #fff);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 260ms ease,
			visibility 0s linear 260ms;
	}

	.tally.on {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 260ms ease,
			visibility 0s;
	}

	/* A panel, not bare soil: the roots behind it are too busy to read over.
	   The page sets its top under the pinned head. */
	.corner {
		display: none;
		left: clamp(24px, 3vw, 48px);
		top: var(--ledger-top, 25vh);
		width: 232px;
		box-sizing: border-box;
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
		margin: 0;
		padding: 18px 18px 16px;
		text-align: left;
		background: rgb(0 0 0 / 0.72);
		border: 1px solid color-mix(in srgb, var(--color-gold-bar) 35%, transparent);
		border-radius: 4px;
	}

	.corner p {
		margin: 0;
	}

	.caption {
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-gold-bar);
	}

	.big {
		--glyph-h: 64px;
		line-height: 1;
	}

	/* Dim while the hero's number is on its way; its own slot stays empty till it lands. */
	.tally.corner.on.waiting {
		opacity: 0.25;
	}

	.corner.waiting .big {
		visibility: hidden;
	}

	.so-far {
		font-size: 15px;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 6px;
	}

	.pts {
		--glyph-h: 24px;
	}

	.ladder {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		--glyph-h: 18px;
	}

	/* A line too long for one row puts its figure under its name, flush right; nothing runs past the panel. */
	.ladder li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 14px;
		row-gap: 3px;
		font-size: 14px;
		transition: opacity 260ms ease;
	}

	.ladder .name {
		flex: 1 1 auto;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.bar {
		flex: 0 0 100%;
		height: 3px;
		background: color-mix(in srgb, var(--color-gold-shard) 18%, transparent);
		overflow: hidden;
	}

	/* The count's own timing, so a line fills as its points arrive. */
	.fill {
		display: block;
		height: 100%;
		background: var(--color-gold-shard);
		transform-origin: 0 50%;
		transition: transform 750ms cubic-bezier(0.33, 1, 0.68, 1);
	}

	.ladder .org {
		border-top: 1px solid color-mix(in srgb, var(--color-gold-bar) 20%, transparent);
		padding-top: 6px;
	}

	.ladder .dim {
		opacity: 0.35;
	}

	.ladder .lit .name {
		color: var(--color-gold-bar);
	}

	.value {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: flex-end;
		gap: 3px;
		min-width: 64px;
		max-width: 100%;
		margin-left: auto;
	}

	.slash,
	.mark {
		font-size: 14px;
		line-height: 1;
	}

	.scores {
		font-size: 12px;
		opacity: 0.85;
	}

	/* The phone strip: the one place a wash is allowed, for legibility over the table. */
	.strip {
		left: 0;
		right: 0;
		bottom: 0;
		height: calc(44px + env(safe-area-inset-bottom, 0px));
		padding: 0 16px env(safe-area-inset-bottom, 0px);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 12px;
		background: rgb(11 17 9 / 0.85);
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
	}

	/* Seven segments along the strip's top: the tabs read, the lit one, the rest. */
	.steps {
		position: absolute;
		top: 0;
		left: 16px;
		right: 16px;
		display: flex;
		gap: 3px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps li {
		flex: 1 1 0;
		height: 3px;
		background: color-mix(in srgb, var(--rtvr-on-dark, #fff) 22%, transparent);
	}

	.steps .done {
		background: color-mix(in srgb, var(--color-gold-shard) 60%, transparent);
	}

	.steps .lit {
		background: var(--color-gold-bar);
	}

	.pct {
		--glyph-h: 22px;
		flex: 0 0 auto;
	}

	.row-pts {
		flex: 0 0 auto;
		opacity: 0.9;
	}

	.row-lit {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: right;
	}

	.row-lit .name {
		color: var(--color-gold-bar);
	}

	@media (min-width: 1100px) {
		.corner {
			display: flex;
		}

		.strip {
			display: none;
		}
	}
</style>
