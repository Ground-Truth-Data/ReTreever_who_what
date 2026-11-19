<script lang="ts">
// The measure the score answer picked, under the hero's number: the figure,
// its unit and a verb ("16.6K ha / restored"), the white tree before a
// count of trees. Never a control.
import treeUrl from "$gc/assets/tree_white.webp";
import type { ScoreTally } from "../whoWhatTypes";
import { symbolCount } from "../weeds/weedsFormat";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

type Measure = NonNullable<ScoreTally["measure"]>;

let { measure, revealed = false }: { measure: Measure; revealed?: boolean } = $props();

const WORDS: Record<Measure["kind"], { unit: (count: number) => string; verb: () => string; label: (p: { count: string }) => string }> = {
	trees: { unit: () => "", verb: m.ww_rating_measure_trees_verb, label: m.ww_rating_trees_planted_label },
	hectares: { unit: () => m.ww_rating_measure_ha(), verb: m.ww_rating_measure_hectares_verb, label: m.ww_rating_hectares_label },
	hectaresMapped: { unit: () => m.ww_rating_measure_ha(), verb: m.ww_rating_measure_hectares_mapped_verb, label: m.ww_rating_hectares_mapped_label },
	sites: { unit: (count) => m.ww_rating_measure_sites_unit({ count }), verb: m.ww_rating_measure_sites_verb, label: m.ww_rating_planting_sites_label },
};

const words = $derived(WORDS[measure.kind]);
// Hectares keep their one decimal only below 10: "4.5", "124". From a thousand the figure is rounded to its symbol, "3.8K".
const full = $derived(measure.value.toLocaleString(getLocale(), { maximumFractionDigits: measure.value < 10 ? 1 : 0 }));
const text = $derived(measure.value >= 1000 ? symbolCount(measure.value) : full);
const unit = $derived(words.unit(measure.value));

// Shown once the numerals' face is in, or the swap would move the unit.
let faceIn = $state(false);
let valueEl = $state<HTMLElement | null>(null);
$effect(() => {
	if (!valueEl) return;
	let live = true;
	document.fonts
		.load(`1em ${getComputedStyle(valueEl).fontFamily}`, text)
		.catch(() => {})
		.then(() => {
			if (live) faceIn = true;
		});
	return () => {
		live = false;
	};
});
</script>

<div class="box" class:revealed={revealed && faceIn} role="img" aria-label={words.label({ count: full })}>
	<span class="figure" aria-hidden="true">
		{#if measure.kind === "trees"}<img class="tree" src={treeUrl} alt="" draggable="false" />{/if}
		<span class="value" bind:this={valueEl}>{text}</span>
		{#if unit}<span class="unit">{unit}</span>{/if}
	</span>
	<span class="verb" aria-hidden="true">{words.verb()}</span>
</div>

<style>
	/* Ink card, gold edge, a hand-placed tilt. Its
	   height is fixed, so the hero can hold its place before it arrives. */
	.box {
		--box-h: var(--measure-h, clamp(56px, 6.5vw, 92px));
		box-sizing: border-box;
		height: var(--box-h);
		width: max-content;
		max-width: 100%;
		padding: 0 calc(var(--box-h) * 0.22) 0 calc(var(--box-h) * 0.2);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		background: var(--rtvr-ink);
		border: 2px solid var(--color-gold-shard);
		border-radius: 3px;
		box-shadow: 2px 3px 6px rgb(12 8 1 / 0.4);
		transform: rotate(-1.2deg);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 260ms ease-out,
			visibility 0s linear 260ms;
	}

	.box.revealed {
		opacity: 1;
		visibility: visible;
		transition-delay: 0s;
	}

	.figure {
		display: flex;
		align-items: baseline;
		gap: calc(var(--box-h) * 0.08);
		line-height: 1;
		white-space: nowrap;
	}

	.value {
		font-family: var(--rt-font-display);
		font-size: calc(var(--box-h) * 0.44);
		color: var(--rtvr-on-dark);
	}

	.tree {
		align-self: center;
		height: calc(var(--box-h) * 0.46);
		width: auto;
		margin-right: calc(var(--box-h) * 0.02);
	}

	.unit,
	.verb {
		font-family: var(--rt-font-web);
		font-weight: 700;
		color: var(--color-gold-shard);
		line-height: 1;
	}

	.unit {
		font-size: calc(var(--box-h) * 0.26);
	}

	.verb {
		margin-top: calc(var(--box-h) * 0.06);
		font-size: calc(var(--box-h) * 0.22);
	}

	@media (scripting: none) {
		.box {
			opacity: 1;
			visibility: visible;
		}
	}
</style>
