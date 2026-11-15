<script lang="ts">
// One layer of the dig: a node on the root, and a sticker card holding one
// big figure, at most one sentence, and the method's word on it.
import type { Snippet } from "svelte";
import TraceIcon, { type TraceIconName } from "./TraceIcon.svelte";
import { m } from "$parent/src/lib/paraglide/messages";

let {
	icon,
	label,
	sentence = null,
	note = null,
	howHref = undefined,
	arrived = true,
	tilt = 0,
	figure,
	children,
}: {
	icon: TraceIconName;
	label: string;
	sentence?: string | null;
	note?: string | null;
	howHref?: string;
	arrived?: boolean;
	tilt?: number;
	figure?: Snippet;
	children?: Snippet;
} = $props();
</script>

<li class="stop" class:arrived>
	<span class="node" aria-hidden="true"><TraceIcon name={icon} /></span>
	<article class="card" style:--tilt="{tilt}deg">
		<h2 class="label">{label}</h2>
		{#if figure}<div class="figure">{@render figure()}</div>{/if}
		{#if sentence}<p class="sentence">{sentence}</p>{/if}
		{#if note}<p class="note">{note}</p>{/if}
		{@render children?.()}
		{#if howHref}
			<a class="how" href={howHref} rel="noopener" target="_blank">{m.ww_rating_trace_how()}</a>
		{/if}
	</article>
</li>

<style>
	.stop {
		--card-pad: clamp(18px, 2.4vw, 28px);
		position: relative;
		list-style: none;
		padding-left: calc(var(--rail-x) + var(--node) / 2 + var(--gutter));
	}

	/* Centred on the rail, level with the card's label. */
	.node {
		position: absolute;
		left: calc(var(--rail-x) - var(--node) / 2);
		top: calc(var(--card-pad) - (var(--node) - 1.2em) / 2);
		box-sizing: border-box;
		width: var(--node);
		height: var(--node);
		padding: calc(var(--node) * 0.24);
		border-radius: 50%;
		background: var(--rtvr-ink);
		border: 2px solid var(--color-gold-shard);
		color: var(--color-gold-shard);
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--rtvr-ink) 55%, transparent);
		transition:
			border-color 300ms ease,
			color 300ms ease;
		z-index: 1;
	}

	.card {
		position: relative;
		box-sizing: border-box;
		max-width: 640px;
		padding: var(--card-pad) var(--card-pad) calc(var(--card-pad) * 0.85);
		background: var(--rtvr-ink);
		border: 2px solid var(--color-gold-shard);
		border-radius: 3px;
		box-shadow: 3px 5px 14px rgb(0 0 0 / 0.45);
		transform: rotate(var(--tilt, 0deg));
		font-family: var(--rt-font-web);
		color: var(--rtvr-on-dark);
		transition:
			opacity 520ms ease-out,
			transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.label {
		margin: 0;
		font-size: clamp(12px, 1.1vw, 14px);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-gold-bar);
		line-height: 1.2;
	}

	.figure {
		--glyph-h: clamp(64px, 7.5vw, 104px);
		margin: clamp(8px, 1.2vw, 14px) 0 clamp(6px, 1vw, 12px);
		line-height: 1;
	}

	.sentence {
		margin: 0;
		max-width: 46ch;
		font-size: clamp(16px, 1.45vw, 20px);
		line-height: 1.4;
		font-weight: 500;
	}

	.note {
		margin: 10px 0 0;
		max-width: 50ch;
		font-size: 14px;
		line-height: 1.4;
		color: var(--rt-cream-dim);
	}

	.how {
		display: inline-block;
		margin-top: 14px;
		font-size: 14px;
		font-weight: 500;
		color: var(--rt-cream-dim);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-gold-shard) 45%, transparent);
		text-underline-offset: 3px;
	}

	.how:hover,
	.how:focus-visible {
		color: var(--rt-cream);
		text-decoration-color: var(--color-gold-shard);
	}

	/* Waiting for the root to reach it: the card below its place, the node unlit. */
	:global(.armed) .stop:not(.arrived) .card {
		opacity: 0;
		transform: translateY(18px) rotate(var(--tilt, 0deg));
	}

	:global(.armed) .stop:not(.arrived) .node {
		border-color: color-mix(in srgb, var(--color-gold-shard) 30%, transparent);
		color: color-mix(in srgb, var(--color-gold-shard) 30%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.card,
		.node {
			transition: none;
		}
	}
</style>
