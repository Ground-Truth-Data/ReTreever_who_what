<script lang="ts">
// An org's places as small tilted cards, kin to the measure box under the
// number: the place in the hero's hand-drawn numerals, the rest of the
// sentence as a caption. Each card is one sentence to a screen reader.
import RatingNumber from "./RatingNumber.svelte";
import type { RankUnit } from "./resultLoad";

let { units, revealed = false }: { units: RankUnit[]; revealed?: boolean } = $props();
</script>

<ul class="ranks" class:revealed>
	{#each units as unit, i (i)}
		<li class="card">
			<span class="sr">{unit.sentence}.</span>
			<span class="face" aria-hidden="true">
				{#if unit.lead}<span class="caption">{unit.lead}</span>{/if}
				<span class="place"><RatingNumber text={unit.digits} label="" /><span class="suffix" class:after-stop={unit.digits.endsWith(".")}>{unit.suffix}</span></span>
				<span class="caption">{unit.caption}</span>
			</span>
		</li>
	{/each}
</ul>

<style>
	.ranks {
		list-style: none;
		margin: clamp(4px, 1vh, 10px) 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
		opacity: 0;
		transition: opacity 260ms ease-out;
	}

	.ranks.revealed {
		opacity: 1;
	}

	@media (scripting: none) {
		.ranks {
			opacity: 1;
		}
	}

	/* The measure box's dress: ink card, gold edge, a slight hand-placed tilt, alternating. */
	.card {
		--glyph-h: clamp(30px, 3vw, 42px);
		display: flex;
		max-width: 100%;
		padding: 7px 14px 8px 11px;
		background: var(--rtvr-ink);
		border: 2px solid var(--color-gold-shard);
		border-radius: 3px;
		box-shadow: 2px 3px 6px rgb(12 8 1 / 0.4);
		transform: rotate(-1.6deg);
	}

	.card:nth-child(2n) {
		transform: rotate(1.2deg);
	}

	.face {
		display: flex;
		align-items: center;
		gap: 9px;
		min-width: 0;
	}

	.place {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: flex-start;
	}

	/* Raised like a printed ordinal, in the numerals' gold. */
	.suffix {
		margin: 1px 0 0 2px;
		font-family: var(--rt-font-web);
		font-size: calc(var(--glyph-h) * 0.42);
		font-weight: 700;
		line-height: 1;
		color: var(--color-gold-shard);
	}

	/* The period glyph carries air on its right; the "º" tucks over it. */
	.suffix.after-stop {
		margin-left: calc(var(--glyph-h) * -0.14);
	}

	.caption {
		max-width: 15ch;
		font-family: var(--rt-font-web);
		font-size: clamp(12px, 1vw, 14px);
		font-weight: 700;
		line-height: 1.15;
		text-align: left;
		color: var(--rtvr-on-dark);
		overflow-wrap: anywhere;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
