<script lang="ts">
// The rating adding up while the reader digs: written free on the soil at the
// window's right edge, or a thin strip on a phone. Never a control.
import { untrack } from "svelte";
import RatingNumber from "../rating/RatingNumber.svelte";
import { TABLE_LABELS, TABLE_SCORES, ladderValue, sumsThrough, tween } from "./tallyMath";
import { WEEDS_TABLES, type ScoreTally } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

let { tally, litIndex, visible }: { tally: ScoreTally; litIndex: number; visible: boolean } = $props();

const LAST = WEEDS_TABLES.length - 1;
const COUNT_MS = 420;

const lit = $derived(tally.tables[litIndex] ?? tally.tables[0]);
const target = $derived(sumsThrough(tally.tables, litIndex));
// An org's score was not broken down when it averaged nothing.
const brokenDown = $derived(tally.kind === "project" || (tally.org?.projects ?? 0) > 0);
// The big figure: a project's counts to its rating; an org's holds the mean
// of its projects until the last tab, then the number after claims.
const bigTarget = $derived.by(() => {
	if (tally.kind === "org") return (litIndex === LAST ? tally.rating : (tally.org?.mean ?? tally.rating)) ?? 0;
	return target.pct ?? 0;
});

let shown = $state({ scored: 0, available: 0, big: 0 });
$effect(() => {
	const to = { scored: target.scored, available: target.available, big: bigTarget };
	const from = untrack(() => ({ ...shown }));
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

const whole = (n: number) => String(Math.round(n));
const bigText = $derived(shown.big.toFixed(1));
const ratingText = $derived((tally.rating ?? 0).toFixed(1));
const ratingWords = $derived(
	new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(Number(ratingText)),
);
const label = $derived(TABLE_LABELS[lit.table]);
const status = $derived(
	m.ww_rating_tally_status({ table: label, awarded: lit.awarded, available: lit.available, scored: target.scored, total: target.available }),
);
</script>

<p class="sr" role="status">{status}</p>

<aside class="tally corner" class:on={visible} aria-hidden="true">
	<p class="caption">{m.ww_rating_tally_caption({ rating: ratingWords })}</p>
	<div class="big"><RatingNumber text={bigText} /></div>
	{#if brokenDown}
		<p class="so-far"><span class="pts"><RatingNumber text={whole(shown.scored)} /></span> {m.ww_rating_tally_points_so_far({ available: whole(shown.available) })}</p>
		<ol class="ladder">
			{#each tally.tables as line, i (line.table)}
				{@const value = ladderValue(line, i, litIndex)}
				<li class:dim={i > litIndex} class:lit={i === litIndex}>
					<span class="name">{TABLE_LABELS[line.table]}</span>
					<span class="value">
						{#if typeof value === "string"}
							<span class="mark">{value}</span>
						{:else}
							<RatingNumber text={String(value.awarded)} /><span class="slash">/</span><RatingNumber text={String(value.available)} />
						{/if}
					</span>
				</li>
			{/each}
			{#if tally.kind === "org" && tally.org}
				<li class:dim={litIndex < LAST} class:lit={litIndex === LAST}>
					<span class="name">{m.ww_rating_tally_mean({ count: tally.org.projects })}</span>
					<span class="value"><RatingNumber text={(tally.org.mean ?? 0).toFixed(1)} /></span>
				</li>
				<li class:dim={litIndex < LAST} class:lit={litIndex === LAST}>
					<span class="name">{m.ww_rating_tally_after_claims()}</span>
					<span class="value"><RatingNumber text={ratingText} /></span>
				</li>
			{/if}
		</ol>
		<p class="scores">{m.ww_rating_tally_table_scores({ table: label, scores: TABLE_SCORES[lit.table] })}</p>
	{:else}
		<p class="scores">{m.ww_rating_tally_not_broken_down_long()}</p>
	{/if}
</aside>

<div class="tally strip" class:on={visible} aria-hidden="true">
	<span class="pct"><RatingNumber text={bigText} /></span>
	{#if brokenDown}
		<span class="row-pts">{m.ww_rating_tally_of({ scored: whole(shown.scored), total: whole(shown.available) })}</span>
		<span class="row-lit"><span class="name">{label}</span> {lit.awarded}/{lit.available}</span>
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

	.corner {
		display: none;
		right: clamp(24px, 3vw, 48px);
		top: 50%;
		transform: translateY(-50%);
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
		margin: 0;
		padding: 0;
		text-align: right;
		text-shadow:
			0 2px 6px rgb(0 0 0 / 0.8),
			0 0 24px rgb(0 0 0 / 0.6);
	}

	.corner p {
		margin: 0;
	}

	.caption {
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #f6a119;
	}

	.big {
		--glyph-h: 64px;
		line-height: 1;
	}

	.so-far {
		font-size: 15px;
		display: flex;
		align-items: baseline;
		gap: 6px;
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
		align-items: flex-end;
		gap: 4px;
		--glyph-h: 18px;
	}

	.ladder li {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 14px;
		font-size: 14px;
		transition: opacity 260ms ease;
	}

	.ladder .dim {
		opacity: 0.35;
	}

	.ladder .lit .name {
		color: #f6a119;
	}

	.value {
		display: inline-flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 3px;
		min-width: 64px;
	}

	.slash,
	.mark {
		font-size: 14px;
		line-height: 1;
	}

	.scores {
		max-width: 220px;
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
		color: #f6a119;
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
