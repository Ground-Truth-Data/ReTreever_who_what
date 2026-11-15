<script lang="ts">
// "How this score was built": a record's published rating walked down to its
// parts as a dig. A root runs down from the hills through the soil, drawing
// itself as the reader scrolls, and each stop is a layer deeper. Every figure
// is the host's, from the published run; the page only words them.
import RatingGround from "../rating/RatingGround.svelte";
import RatingNumber from "../rating/RatingNumber.svelte";
import CountUp from "./CountUp.svelte";
import TraceStop from "./TraceStop.svelte";
import { formatRatingOutOf } from "../whoWhatTypes";
import type { ScoreTrace, TraceRoutes } from "./traceTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale, localizeHref } from "$parent/src/lib/paraglide/runtime";

let { trace, routes }: { trace: ScoreTrace; routes: TraceRoutes } = $props();

const count = (n: number) => n.toLocaleString(getLocale());
const oneDecimal = (n: number) => n.toFixed(1);
// A ratio to two places, but a whole one as "1.0".
const ratioText = (n: number) => (n === 1 ? "1.0" : n.toFixed(2));
const whole = (n: number) => Math.round(n).toLocaleString(getLocale());
const method = (s: Parameters<NonNullable<TraceRoutes["method"]>>[0]) => routes.method?.(s);

const PEERS: Record<string, () => string> = {
	developer_ish: m.ww_rating_trace_peers_developer_ish,
	landowner_ish: m.ww_rating_trace_peers_landowner_ish,
	producer_ish: m.ww_rating_trace_peers_producer_ish,
	research_ish: m.ww_rating_trace_peers_research_ish,
	supplier_ish: m.ww_rating_trace_peers_supplier_ish,
	ngo_ish: m.ww_rating_trace_peers_ngo_ish,
	marketplace_ish: m.ww_rating_trace_peers_marketplace_ish,
	nursery_ish: m.ww_rating_trace_peers_nursery_ish,
	sponsor_ish: m.ww_rating_trace_peers_sponsor_ish,
	all: m.ww_rating_trace_peers_all,
};
const peers = (group: string | null) => (group && PEERS[group] ? PEERS[group]() : m.ww_rating_trace_peers_none());

const runDate = $derived(
	trace.run ? new Date(trace.run.at).toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" }) : null,
);

// The root draws down to a point near the window's foot; a stop
// arrives once the root reaches its node, and stays arrived.
let threadEl = $state<HTMLElement | null>(null);
let armed = $state(false);
let drawn = $state(1);
let reached = $state(Infinity);
const READ_LINE = 0.85;

$effect(() => {
	const thread = threadEl;
	if (!thread || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	armed = true;
	// The first stop is on the first screen and is there from the start; the rest arrive as the root reaches them.
	reached = 0;
	let raf = 0;
	const read = () => {
		raf = 0;
		const box = thread.getBoundingClientRect();
		const head = innerHeight * READ_LINE - box.top;
		drawn = Math.min(1, Math.max(0, head / box.height));
		const nodes = thread.querySelectorAll<HTMLElement>(".node");
		nodes.forEach((node, i) => {
			if (i > reached && node.getBoundingClientRect().top + node.offsetHeight / 2 - box.top <= head) reached = i;
		});
		// The page's foot can sit above the read line: the last stops arrive when the window can scroll no further.
		if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
			reached = nodes.length - 1;
			drawn = 1;
		}
	};
	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(read);
	};
	onScroll();
	addEventListener("scroll", onScroll, { passive: true });
	addEventListener("resize", onScroll);
	return () => {
		removeEventListener("scroll", onScroll);
		removeEventListener("resize", onScroll);
		if (raf) cancelAnimationFrame(raf);
	};
});

const at = (i: number) => i <= reached;
const TILTS = [-1.1, 0.8, -0.6, 1];
</script>

<div class="trace-page" class:armed style:--drawn={drawn}>
<RatingGround short>
	{#snippet hero()}
		<div class="hero-in">
			<a class="back" href={localizeHref(routes.rating)}>← {m.ww_rating_trace_back()}</a>
			<p class="eyebrow">{m.ww_rating_trace_title()}</p>
			<h1 class="name">{trace.name}</h1>
			{#if trace.rating !== null}
				<div class="hero-number">
					<RatingNumber rating={trace.rating} outOf={100} label={formatRatingOutOf(trace.rating)} />
				</div>
			{/if}
			{#if runDate}<p class="run">{m.ww_rating_trace_run({ date: runDate })}</p>{/if}
		</div>
	{/snippet}

	{#snippet underground()}
	<section class="soil">
		{#if trace.score === null}
			<p class="unscored">{m.ww_rating_trace_unscored()}</p>
		{:else if trace.rating === null}
			<p class="unscored">{m.ww_rating_trace_unrated()}</p>
		{:else}
			{@const rating = trace.rating}
			<div class="thread" bind:this={threadEl}>
				<span class="rail" aria-hidden="true"></span>
				<span class="rail fill" aria-hidden="true"></span>
				<ol class="stops">
					{#snippet place(rank: number | null, of: number | null, run: boolean)}
						{#if rank !== null && of !== null}
							<CountUp value={rank} format={(n) => String(Math.round(n))} outOf={of} {run} label={m.ww_rating_trace_place({ rank: count(rank), count: count(of) })} />
						{/if}
					{/snippet}

					{#if trace.kind === "org"}
						{@const claims = trace.reviewed && trace.ratio !== null}
						{@const projectsAt = claims ? 3 : 1}
						<TraceStop
							icon="trophy"
							label={trace.group === "all" ? m.ww_rating_trace_rank_label_all() : m.ww_rating_trace_rank_label({ peers: peers(trace.group) })}
							sentence={trace.rankOf !== null
								? m.ww_rating_trace_rank_org({ percent: whole(rating), count: count(trace.rankOf), peers: peers(trace.group) })
								: null}
							note={trace.group === "all" ? m.ww_rating_trace_rank_all_note() : null}
							howHref={method("rating")}
							arrived={at(0)}
							tilt={TILTS[0]}
						>
							{#snippet figure()}{@render place(trace.rank, trace.rankOf, at(0))}{/snippet}
						</TraceStop>

						{#if claims}
							{@const full = (trace.ratio ?? 1) >= 1}
							<TraceStop
								icon="times"
								label={m.ww_rating_trace_score_label()}
								sentence={full
									? m.ww_rating_trace_score_found_all({ field: oneDecimal(trace.fieldScore ?? 0) })
									: m.ww_rating_trace_score_reduced({ field: oneDecimal(trace.fieldScore ?? 0) })}
								howHref={method("orgScore")}
								arrived={at(1)}
								tilt={TILTS[1]}
							>
								{#snippet figure()}
									<CountUp value={trace.score ?? 0} format={oneDecimal} run={at(1)} label={formatRatingOutOf(trace.score)} />
								{/snippet}
							</TraceStop>

							<TraceStop
								icon="scale"
								label={m.ww_rating_trace_ratio_label()}
								sentence={m.ww_rating_trace_ratio()}
								howHref={method("disclosure")}
								arrived={at(2)}
								tilt={TILTS[2]}
							>
								{#snippet figure()}
									<CountUp value={trace.ratio ?? 1} format={ratioText} run={at(2)} label={ratioText(trace.ratio ?? 1)} />
								{/snippet}
							</TraceStop>
						{/if}

						<TraceStop
							icon="sigma"
							label={trace.projectsScored === 1 ? m.ww_rating_trace_projects_label_one() : m.ww_rating_trace_projects_label({ count: count(trace.projectsScored) })}
							sentence={[
								trace.projectsScored === 1 ? m.ww_rating_trace_projects_one() : m.ww_rating_trace_projects_many(),
								claims ? "" : m.ww_rating_trace_nothing_taken_off(),
							].join(" ").trim()}
							howHref={method("orgProjects")}
							arrived={at(projectsAt)}
							tilt={TILTS[projectsAt]}
						>
							{#snippet figure()}
								<CountUp value={trace.fieldScore ?? 0} format={oneDecimal} run={at(projectsAt)} label={formatRatingOutOf(trace.fieldScore)} />
							{/snippet}
						</TraceStop>
					{:else}
						<TraceStop
							icon="trophy"
							label={m.ww_rating_trace_project_rank_label()}
							sentence={trace.rankOf !== null ? m.ww_rating_trace_project_rank({ percent: whole(rating), count: count(trace.rankOf) }) : null}
							howHref={method("rating")}
							arrived={at(0)}
							tilt={TILTS[0]}
						>
							{#snippet figure()}{@render place(trace.rank, trace.rankOf, at(0))}{/snippet}
						</TraceStop>

						<TraceStop
							icon="sigma"
							label={m.ww_rating_trace_points_label()}
							sentence={m.ww_rating_trace_points({ scored: count(trace.pointsScored ?? 0), available: count(trace.pointsAvailable ?? 0) })}
							howHref={method("projectScore")}
							arrived={at(1)}
							tilt={TILTS[1]}
						>
							{#snippet figure()}
								<CountUp value={trace.score ?? 0} format={oneDecimal} run={at(1)} label={formatRatingOutOf(trace.score)} />
							{/snippet}
						</TraceStop>
					{/if}
				</ol>
			</div>
		{/if}

		<footer class="foot">
			{#if routes.method}<a href={routes.method("rating")} rel="noopener" target="_blank">{m.ww_rating_trace_method()}</a>{/if}
			<a href={localizeHref(routes.rating)}>{m.ww_rating_trace_back()}</a>
		</footer>
	</section>
	{/snippet}
</RatingGround>
</div>

<style>
	.trace-page {
		--rail-x: clamp(22px, 3vw, 34px);
		--node: clamp(40px, 3.6vw, 48px);
		--gutter: clamp(14px, 2vw, 28px);
		--soil-pad: clamp(16px, 3vh, 40px);
	}

	/* The rating page's words: the name dark on the sky, the number in the
	   designer's numerals beside it, so the hero stays short enough for the
	   first stop to show under the grass on the first screen. */
	.hero-in {
		position: relative;
		z-index: 5;
		width: 100%;
		max-width: 860px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"back back"
			"eyebrow number"
			"name number"
			"run number";
		align-content: start;
		align-items: end;
		column-gap: clamp(16px, 3vw, 40px);
		row-gap: clamp(4px, 0.8vh, 8px);
		font-family: var(--rt-font-web);
		color: var(--rt-gold-ink);
	}

	.back {
		grid-area: back;
		justify-self: start;
		font-size: 15px;
		font-weight: 700;
		color: var(--rt-gold-ink);
		text-decoration: none;
		margin-bottom: clamp(4px, 1.2vh, 14px);
	}

	.back:hover,
	.back:focus-visible {
		text-decoration: underline;
	}

	.eyebrow {
		grid-area: eyebrow;
		margin: 0;
		font-size: clamp(13px, 1.2vw, 16px);
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.name {
		grid-area: name;
		margin: 0;
		font-size: clamp(24px, 3vw, 40px);
		font-weight: 700;
		line-height: 1.1;
		word-break: break-word;
		text-shadow:
			0 1px 1px rgb(255 255 255 / 0.35),
			1px 2px 3px rgb(12 8 1 / 0.4);
	}

	.hero-number {
		grid-area: number;
		--glyph-h: clamp(64px, 8vw, 120px);
	}

	.run {
		grid-area: run;
		margin: 0;
		font-size: 14px;
		font-weight: 500;
	}

	@media (max-width: 720px) {
		.hero-in {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: "back" "eyebrow" "name" "number" "run";
		}
	}

	/* At least as deep as the ground picture, so a short page still ends in its fade. */
	.soil {
		--ground-h: max(calc(100vw * 712 / 986), 100dvh, 860px);
		position: relative;
		box-sizing: border-box;
		min-height: calc(var(--ground-h) - var(--soil-overlap));
		padding: var(--soil-pad) var(--pad) clamp(48px, 8vh, 96px);
	}

	/* The ground picture is drawn once, as on the rating page, and this page
	   can run deeper than it: its foot fades into the dark instead of ending
	   on a line. Its height is the underground's --ground-w at the art's ratio. */
	.soil::before {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		top: calc(var(--ground-h) - var(--soil-overlap) - 240px);
		height: 241px;
		background: linear-gradient(transparent, #0b1109);
		pointer-events: none;
	}

	.thread {
		position: relative;
		max-width: 860px;
		margin: 0 auto;
	}

	.stops {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(64px, 14vh, 150px);
	}

	/* A root: thick where it leaves the hills, thinning as it goes down. */
	/* A root: it grows out of the soil under the grass hair-thin and faint,
	   reaches its full width over its first --emerge, then thins as it goes
	   down. The fill is the same shape, shown down to how far it has drawn. */
	.rail {
		--emerge: 90px;
		position: absolute;
		left: calc(var(--rail-x) - 5px);
		top: calc(-1 * var(--soil-pad) - var(--soil-overlap) * 0.5);
		bottom: 0;
		width: 10px;
		clip-path: polygon(50% 0, 50% 0, 100% var(--emerge), 62% 100%, 38% 100%, 0 var(--emerge));
		-webkit-mask-image: linear-gradient(transparent, #000 var(--emerge));
		mask-image: linear-gradient(transparent, #000 var(--emerge));
		background: color-mix(in srgb, var(--color-gold-shard) 22%, transparent);
	}

	.rail.fill {
		--to: calc(var(--drawn, 1) * 100%);
		background: linear-gradient(var(--color-gold-shard), var(--color-gold-bar));
		-webkit-mask-image: linear-gradient(transparent, #000 var(--emerge), #000 var(--to), transparent var(--to));
		mask-image: linear-gradient(transparent, #000 var(--emerge), #000 var(--to), transparent var(--to));
	}

	.unscored {
		max-width: 860px;
		margin: 0 auto;
		font-family: var(--rt-font-web);
		font-size: clamp(18px, 1.6vw, 22px);
		color: var(--rtvr-on-dark);
	}

	.foot {
		max-width: 860px;
		margin: clamp(56px, 10vh, 110px) auto 0;
		padding-left: calc(var(--rail-x) + var(--node) / 2 + var(--gutter));
		display: flex;
		flex-wrap: wrap;
		gap: 12px 28px;
		font-family: var(--rt-font-web);
		font-size: 15px;
	}

	.foot a {
		color: var(--rt-cream);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-gold-shard) 55%, transparent);
		text-underline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.rail.fill {
			--drawn: 1;
		}
	}
</style>
