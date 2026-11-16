<script lang="ts">
// How the rating adds up, built while the reader digs: a card at the window's
// left edge, or a strip along a phone's foot. On the last table it walks the
// score through the claim and the place among its peers to the hero's number.
// Never a control.
import { untrack } from "svelte";
import RatingNumber from "../rating/RatingNumber.svelte";
import {
	TABLE_LABELS,
	barFill,
	claimLine,
	ladderValue,
	landingBeats,
	ownBar,
	peerBars,
	peersLit,
	placeLine,
	tallySteps,
	tallyTargets,
	tween,
} from "./tallyMath";
import { fullCount, shortCount } from "./weedsFormat";
import { WEEDS_TABLES, type ScoreTally } from "../whoWhatTypes";
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
	/** The page that walks this score down to its parts; absent, no link. */
	traceHref?: string;
} = $props();

const LAST = WEEDS_TABLES.length - 1;
const COUNT_MS = 750;

// An org's score was not broken down when it averaged nothing.
const brokenDown = $derived(tally.kind === "project" || (tally.org?.projects ?? 0) > 0);
const steps = $derived(brokenDown ? tallySteps(tally) : []);
const claim = $derived(claimLine(tally));
const place = $derived(placeLine(tally));
const bars = $derived(tally.place ? peerBars(tally.place.peers) : []);
const own = $derived(tally.place ? ownBar(tally.place) : -1);

// The step lit; steps.length once the walk has reached the rating.
let stage = $state(0);
let peerK = $state(0);
let shown = $state({ scored: 0, available: 0, big: 0 });
let wasLanded = false;

$effect(() => {
	const goal = tallyTargets(tally, litIndex);
	const beats = landingBeats(tally);
	const atEnd = litIndex >= LAST && brokenDown;
	if (!landed) {
		stage = 0;
		peerK = 0;
		shown = { scored: 0, available: 0, big: tally.rating ?? 0 };
		wasLanded = false;
		return;
	}
	// The landing number drops to 0 and counts up, so the reader sees the tables build it.
	const from = wasLanded ? untrack(() => ({ ...shown })) : { scored: 0, available: 0, big: 0 };
	wasLanded = true;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		stage = atEnd ? beats.length : 0;
		peerK = atEnd ? 1 : 0;
		shown = { ...goal, big: atEnd ? beats[beats.length - 1].to : goal.big };
		return;
	}
	let dead = false;
	let raf = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const run = (ms: number, step: (k: number) => void) =>
		new Promise<void>((done) => {
			const t0 = performance.now();
			const tick = (now: number) => {
				if (dead) return;
				const t = Math.min(1, (now - t0) / ms);
				step(t);
				if (t < 1) raf = requestAnimationFrame(tick);
				else done();
			};
			raf = requestAnimationFrame(tick);
		});
	const hold = (ms: number) => new Promise<void>((done) => (timer = setTimeout(done, ms)));
	const count = (to: typeof goal) => run(COUNT_MS, (t) => (shown = { scored: tween(from.scored, to.scored, t), available: tween(from.available, to.available, t), big: tween(from.big, to.big, t) }));

	stage = 0;
	peerK = 0;
	if (!atEnd) count(goal);
	else
		(async () => {
			await count(goal);
			for (let i = 1; i < beats.length; i++) {
				await hold(beats[i - 1].hold);
				if (dead) return;
				stage = i;
				const b0 = untrack(() => shown.big);
				const beat = beats[i];
				await run(beat.ms, (t) => {
					shown = { ...goal, big: tween(b0, beat.to, t) };
					if (beat.peers) peerK = tween(0, 1, t);
				});
			}
			if (!dead) stage = beats.length;
		})();
	return () => {
		dead = true;
		cancelAnimationFrame(raf);
		clearTimeout(timer);
	};
});

const done = $derived(stage >= steps.length && steps.length > 0);
const reachedRating = $derived(done && steps[steps.length - 1] === "place");
const lit = $derived(tally.tables[litIndex] ?? tally.tables[0]);
const pair = (a: number, b: number) => `${fullCount(a)} / ${fullCount(b)}`;
const one = (n: number) => n.toFixed(1);
const bigText = $derived(one(shown.big));
const pctText = $derived(shown.available > 0 ? one((shown.scored / shown.available) * 100) : "–");
const lightUpTo = $derived(peersLit(own, peerK));
const headline = $derived(
	new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(
		Number(one(tally.rating ?? tally.score ?? 0)),
	),
);
const stepTitle = (step: string) =>
	step === "points" ? m.ww_rating_tally_step_points() : step === "claims" ? m.ww_rating_tally_step_claims() : (place?.among ?? "");

// The strip's one line: what the step in hand adds.
const stripLine = $derived.by(() => {
	if (!brokenDown) return m.ww_rating_tally_not_broken_down();
	const step = steps[Math.min(stage, steps.length - 1)];
	if (litIndex < LAST || (step === "points" && !done)) {
		const sums = m.ww_rating_tally_so_far({ scored: shortCount(shown.scored), total: shortCount(shown.available) });
		return litIndex < LAST ? `${TABLE_LABELS[lit.table]} ${shortCount(lit.awarded)}/${shortCount(lit.available)} · ${sums}` : sums;
	}
	if (step === "claims") return `${claim.words} ${claim.factor}`;
	if (step === "place" && place) return place.short;
	return m.ww_rating_tally_so_far({ scored: shortCount(shown.scored), total: shortCount(shown.available) });
});

const status = $derived.by(() => {
	if (reachedRating && place) return m.ww_rating_tally_status_landed({ place: place.short, rating: one(tally.rating ?? 0) });
	const goal = tallyTargets(tally, litIndex);
	return m.ww_rating_tally_status({
		table: TABLE_LABELS[lit.table],
		awarded: fullCount(lit.awarded),
		available: fullCount(lit.available),
		scored: fullCount(goal.scored),
		total: fullCount(goal.available),
	});
});
</script>

<p class="sr" role="status">{status}</p>

<aside class="tally corner" class:on={visible} class:waiting={!landed} class:done={reachedRating}>
	<div class="face" aria-hidden="true">
		<p class="caption">{m.ww_rating_tally_adds_up({ rating: headline })}</p>
		<div class="big">
			<RatingNumber text={bigText} outOf={100} />
			<!-- Its row is held from the start so the card does not grow when it lands. -->
			{#if steps[steps.length - 1] === "place"}<span class="match" class:shown={reachedRating}>{m.ww_rating_tally_match()}</span>{/if}
		</div>
		{#if brokenDown}
			<ol class="steps">
				{#each steps as step, i (step)}
					<li class:done={i < stage} class:wait={i > stage}>
						<span class="no">{i + 1}</span>
						<div class="body">
							<h3>{stepTitle(step)}</h3>
							{#if step === "points"}
								<ol class="ladder">
									{#each tally.tables as line, t (line.table)}
										{@const value = ladderValue(line, t, litIndex)}
										{@const fill = barFill(line, t, landed ? litIndex : -1)}
										<li class:dug={t <= litIndex} class:lit={t === litIndex}>
											<span class="name">{TABLE_LABELS[line.table]}</span>
											<span class="bar">{#if fill !== null}<span class="fill" style:transform="scaleX({fill})"></span>{/if}</span>
											{#if typeof value === "string"}
												<span class="pts">{value}</span>
											{:else}
												<span class="pts" title={pair(value.awarded, value.available)}>{shortCount(value.awarded)} / {shortCount(value.available)}</span>
											{/if}
										</li>
									{/each}
								</ol>
								<p class="line" title={pair(shown.scored, shown.available)}>
									<span>{m.ww_rating_tally_so_far({ scored: shortCount(shown.scored), total: shortCount(shown.available) })}</span>
									<span class="to">{pctText}</span>
								</p>
							{:else if step === "claims"}
								<p class="line"><span>{claim.words}</span><span class="to">{claim.factor}</span></p>
								{#if claim.leaves}<p class="line"><span>{claim.leaves}</span></p>{/if}
							{:else if place}
								<svg class="mini" viewBox="0 0 240 34" preserveAspectRatio="none">
									{#each bars as b, p (p)}
										<rect class:me={p === own} class:lit={p < lightUpTo} x={b.x} y={b.y} width={b.w} height={b.h} rx="1" />
									{/each}
								</svg>
								<p class="line"><span>{place.place}</span><span class="to">{one(tally.rating ?? 0)}</span></p>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="note">{m.ww_rating_tally_not_broken_down_long()}</p>
		{/if}
	</div>
	{#if traceHref}<a class="trace-link" href={traceHref}>{m.ww_rating_trace_link()}</a>{/if}
</aside>

<div class="tally strip" class:on={visible}>
	<div class="face" aria-hidden="true">
		<span class="pct"><RatingNumber text={bigText} /></span>
		<span class="what">{stripLine}</span>
		{#if steps.length}
			<span class="dots">
				{#each steps as step, i (step)}
					<i class:on={i <= stage} class:done={i < stage}>{i + 1}</i>
				{/each}
			</span>
		{/if}
	</div>
	{#if traceHref}<a class="trace-link" href={traceHref}>{m.ww_rating_trace_link_short()}</a>{/if}
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
		color: var(--rt-cream-dim);
		font-variant-numeric: tabular-nums;
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

	/* The page's sticker dress: ink, a gold edge, a slight tilt. The page sets its top under the pinned head. */
	.corner {
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
		border: 2px solid var(--color-gold-shard);
		border-radius: 3px;
		box-shadow: 3px 5px 14px rgb(0 0 0 / 0.5);
		transform: rotate(-0.8deg);
		overflow: hidden;
	}

	.corner p,
	.corner h3 {
		margin: 0;
	}

	/* The figures are drawn for the eye (the status line speaks them) and lay out as the card's own children. */
	.face {
		display: contents;
	}

	/* The one thing in the tally that takes a click; the rest lets clicks through to the table. */
	.trace-link {
		pointer-events: auto;
		color: var(--color-gold-bar);
		font-size: 13px;
		font-weight: 700;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-gold-bar) 55%, transparent);
		text-underline-offset: 3px;
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
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 4px 8px;
	}

	.match {
		flex-basis: 100%;
		font-size: 12px;
		font-weight: 700;
		color: var(--color-gold-shard);
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.match.shown {
		opacity: 1;
	}

	/* Dim while the hero's number is on its way; its own slot stays empty till it lands. */
	.tally.corner.on.waiting {
		opacity: 0.25;
	}

	.corner.waiting .big {
		visibility: hidden;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 12px;
	}

	.steps > li {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr);
		gap: 0 10px;
		transition: opacity 300ms ease;
	}

	.steps > li.wait {
		opacity: 0.38;
	}

	.no {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		box-sizing: border-box;
		border: 1.5px solid var(--color-gold-shard);
		border-radius: 50%;
		color: var(--color-gold-shard);
		font-size: 12px;
		font-weight: 700;
		transition:
			background-color 300ms ease,
			color 300ms ease;
	}

	.steps > li.done .no {
		background: var(--color-gold-shard);
		color: var(--rtvr-ink);
	}

	.body {
		min-width: 0;
	}

	h3 {
		margin: 2px 0 6px;
		font-size: 14px;
		font-weight: 700;
		line-height: 1.25;
		color: var(--rtvr-on-dark);
	}

	.line {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 13px;
	}

	.line .to {
		flex: 0 0 auto;
		color: var(--color-gold-shard);
		font-weight: 700;
	}

	.ladder {
		list-style: none;
		margin: 0 0 6px;
		padding: 0;
		display: grid;
		gap: 3px;
		font-size: 12.5px;
	}

	.ladder li {
		display: grid;
		grid-template-columns: 6.6em minmax(0, 1fr) auto;
		align-items: center;
		gap: 6px;
		color: rgb(255 255 255 / 0.4);
	}

	.ladder .name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ladder li.dug {
		color: var(--rt-cream);
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

	/* The count's own timing, so a line fills as its points arrive. */
	.fill {
		display: block;
		height: 100%;
		background: var(--color-gold-shard);
		transform-origin: 0 50%;
		transition: transform 750ms cubic-bezier(0.33, 1, 0.68, 1);
	}

	.pts {
		min-width: 4.6em;
		text-align: right;
		white-space: nowrap;
	}

	.mini {
		display: block;
		width: 100%;
		height: 34px;
		margin: 2px 0 6px;
	}

	.mini rect {
		fill: rgb(255 255 255 / 0.2);
		transition: fill 120ms ease;
	}

	.mini rect.lit {
		fill: var(--color-gold-shard);
	}

	.mini rect.me {
		fill: var(--rtvr-on-dark);
	}

	.note {
		font-size: 13px;
	}

	/* The phone strip: the number, what the step in hand adds, the steps as dots, and the trace link under it. */
	.strip {
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: auto auto;
		align-items: center;
		gap: 2px 12px;
		box-sizing: border-box;
		padding: 7px max(16px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px))
			max(16px, env(safe-area-inset-left, 0px));
		background: var(--rtvr-ink);
		border-top: 2px solid var(--color-gold-shard);
		font-size: 12.5px;
	}

	.pct {
		--glyph-h: 30px;
		grid-row: 1 / 3;
		filter: none;
	}

	.what {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--rtvr-on-dark);
	}

	.dots {
		grid-row: 1 / 3;
		grid-column: 3;
		display: flex;
		gap: 4px;
	}

	.dots i {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		border: 1.5px solid var(--color-gold-shard);
		border-radius: 50%;
		font: 700 10px var(--rt-font-web);
		font-style: normal;
		color: var(--color-gold-shard);
		opacity: 0.4;
	}

	.dots i.on {
		opacity: 1;
	}

	.dots i.done {
		background: var(--color-gold-shard);
		color: var(--rtvr-ink);
	}

	.strip .trace-link {
		grid-column: 2;
		grid-row: 2;
		justify-self: start;
		font-size: 12px;
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
		.fill,
		.steps > li,
		.no,
		.mini rect,
		.match {
			transition: none;
		}
	}
</style>
