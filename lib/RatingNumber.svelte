<script lang="ts">
// The score as the designer's numerals: one <img> per glyph, laid in a row.
// Glyphs share one canvas height (scripts/import-rtvr-assets.py crops columns,
// never rows), so a row of them keeps the baseline without any alignment math.
import { formatTransparencyScore } from "./whoWhatTypes";

const GLYPHS = import.meta.glob<string>("./assets/pub-Rtvr/rating/numbers/*.webp", {
	eager: true,
	query: "?url",
	import: "default",
});

function glyphUrl(ch: string): string | undefined {
	const file = ch === "." ? "period.webp" : `${ch}.webp`;
	return Object.entries(GLYPHS).find(([path]) => path.endsWith(`/${file}`))?.[1];
}

let { rating }: { rating: number } = $props();

const text = $derived(rating.toFixed(1));
const chars = $derived(text.split(""));
</script>

<span class="rating-number" role="img" aria-label={formatTransparencyScore(rating)}>
	{#each chars as ch, i (i)}
		<img class="glyph" class:period={ch === "."} src={glyphUrl(ch)} alt="" draggable="false" />
	{/each}
</span>

<style>
	.rating-number {
		display: inline-flex;
		align-items: flex-end;
		/* Glyph height is the one knob; widths follow each glyph's own columns. */
		--glyph-h: clamp(96px, 18vw, 260px);
		height: var(--glyph-h);
		/* The strokes are hand-drawn with air around them; pull the glyphs together. */
		gap: calc(var(--glyph-h) * -0.06);
		filter:
			drop-shadow(2px 3px 2px rgb(12 8 1 / 0.45))
			drop-shadow(8px 12px 16px rgb(12 8 1 / 0.3));
	}

	.glyph {
		height: 100%;
		width: auto;
		display: block;
		user-select: none;
		-webkit-user-drag: none;
	}
</style>
