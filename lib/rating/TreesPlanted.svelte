<script lang="ts">
// The designer's "Trees Planted" box under the hero's number, the record's
// published count in its lower two thirds. Never a control.
import BoxRaw from "../assets/svg/rating/Rating_page_trees_planted_box.svg?raw";

let { value = undefined, revealed = false }: { value?: number | null; revealed?: boolean } = $props();

// Null is unknown, and so is a tally that has not landed; 0 is a published nothing.
const text = $derived(typeof value === "number" ? value.toLocaleString("en") : "—");
</script>

<div class="box" class:revealed role="img" aria-label="Trees planted: {text}" style="--chars: {text.length}">
	<span class="art" aria-hidden="true">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html BoxRaw}
	</span>
	<span class="value" aria-hidden="true">{text}</span>
</div>

<style>
	.box {
		--box-h: clamp(56px, 6.5vw, 92px);
		position: relative;
		display: block;
		height: var(--box-h);
		filter: drop-shadow(2px 3px 6px rgb(12 8 1 / 0.4));
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

	.art :global(svg) {
		height: 100%;
		width: auto;
		display: block;
	}

	/* The sticker's label sits in its top third; the value fills the rest and
	   shrinks for a long count so it stays inside the box. */
	.value {
		position: absolute;
		left: 0;
		right: 0;
		top: 38%;
		bottom: 0;
		display: grid;
		place-items: center;
		color: var(--rtvr-on-dark);
		font-family: var(--rt-font-web);
		font-weight: 700;
		font-size: min(clamp(22px, 2.6vw, 38px), calc(var(--box-h) * 2.1 / var(--chars)));
		line-height: 1;
		pointer-events: none;
	}

	@media (scripting: none) {
		.box {
			opacity: 1;
			visibility: visible;
		}
	}
</style>
