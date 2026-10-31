<script lang="ts">
// The score as the designer's numerals: one <img> per glyph, laid in a row.
// Glyphs share one canvas height (scripts/import-rtvr-assets.py crops columns,
// never rows), so a row of them keeps the baseline without any alignment math.
import { formatTransparencyScore } from "../whoWhatTypes";

const GLYPHS = import.meta.glob<string>("../assets/pub-Rtvr/rating/numbers/*.webp", {
	eager: true,
	query: "?url",
	import: "default",
});

function glyphUrl(ch: string): string | undefined {
	const file = ch === "." ? "period.webp" : `${ch}.webp`;
	return Object.entries(GLYPHS).find(([path]) => path.endsWith(`/${file}`))?.[1];
}

let {
	rating = undefined,
	text = undefined,
	settled = true,
}: {
	rating?: number;
	/** Digits and at most one period, drawn as given; wins over `rating` and is the label. */
	text?: string;
	/** False holds the period back; it fades in when this flips. The label carries the full score throughout. */
	settled?: boolean;
} = $props();

const shown = $derived(text ?? (rating ?? 0).toFixed(1));
const chars = $derived(shown.split("").filter((ch) => ch === "." || (ch >= "0" && ch <= "9")));
const label = $derived(text ?? formatTransparencyScore(rating));
</script>

<span class="rating-number" class:unsettled={!settled} role="img" aria-label={label}>
	{#each chars as ch, i (i)}
		<img class="glyph" class:period={ch === "."} src={glyphUrl(ch)} alt="" draggable="false" />
	{/each}
</span>

<style>
	.rating-number {
		display: inline-flex;
		align-items: flex-end;
		/* Glyph height is the one knob, set by whoever mounts it; widths follow each glyph's own columns. */
		--size: var(--glyph-h, clamp(96px, 14vw, 210px));
		height: var(--size);
		/* The strokes are hand-drawn with air around them; pull the glyphs together. */
		gap: calc(var(--size) * -0.06);
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

	.period {
		transition: opacity 160ms ease-out;
	}

	.unsettled .period {
		opacity: 0;
	}
</style>
