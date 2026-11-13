<script lang="ts">
// A row count as the weeds stage draws one: the number in the page's
// hand-drawn numerals, the rest of the sentence as type beside it. The whole
// sentence is what a screen reader hears.
import RatingNumber from "../rating/RatingNumber.svelte";

let { count, text }: { count: number; text: string } = $props();

// A language that does not lead with the number shows the sentence as type.
const lead = $derived(String(count));
const rest = $derived(text.startsWith(lead) ? text.slice(lead.length) : null);
</script>

<span class="weeds-count">
	<span class="sr">{text}</span>
	<span class="face" aria-hidden="true">
		{#if rest !== null}
			<span class="fig"><RatingNumber text={lead} label="" /></span><span class="noun">{rest}</span>
		{:else}
			<span class="noun">{text}</span>
		{/if}
	</span>
</span>

<style>
	.weeds-count {
		display: inline-flex;
		--glyph-h: var(--count-h, 22px);
	}

	.face {
		display: inline-flex;
		align-items: flex-end;
		gap: 6px;
		flex-wrap: wrap;
	}

	.fig {
		flex: 0 0 auto;
		line-height: 1;
	}

	/* The tally's caption voice: small, spaced, gold. */
	.noun {
		padding-bottom: 2px;
		font-family: var(--rt-font-web);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-gold-bar);
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
