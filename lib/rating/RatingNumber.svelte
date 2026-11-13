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
	outOf = undefined,
	label = undefined,
}: {
	rating?: number;
	/** Drawn as given: digits and "." as glyphs, anything else ("," "K" " mil") as type on the baseline. Wins over `rating`. */
	text?: string;
	/** False holds the period back; it fades in when this flips. The label carries the full score throughout. */
	settled?: boolean;
	/** A small "/100" on the number's baseline, so it reads as a share of that. */
	outOf?: number;
	/** What a screen reader hears; defaults to `text`, else the score as a percent. */
	label?: string;
} = $props();

const isGlyph = (ch: string) => ch === "." || (ch >= "0" && ch <= "9");
// Runs of non-glyph characters stay together, so "226.6 k" is glyphs, then " k" as one word.
function pieces(s: string): { glyph: boolean; s: string }[] {
	const out: { glyph: boolean; s: string }[] = [];
	for (const ch of s) {
		const glyph = isGlyph(ch);
		const last = out[out.length - 1];
		if (!glyph && last && !last.glyph) last.s += ch;
		else out.push({ glyph, s: ch });
	}
	return out;
}

const shown = $derived(text ?? (rating ?? 0).toFixed(1));
const parts = $derived(pieces(shown));
const denominator = $derived(outOf === undefined ? [] : String(outOf).split(""));
const spoken = $derived(label ?? text ?? formatTransparencyScore(rating));
</script>

<span class="rating-number" class:unsettled={!settled} role="img" aria-label={spoken}>
	{#each parts as part, i (i)}
		{#if part.glyph}
			<img class="glyph" class:period={part.s === "."} src={glyphUrl(part.s)} alt="" draggable="false" />
		{:else}
			<span class="type">{part.s}</span>
		{/if}
	{/each}
	{#if denominator.length}
		<span class="out-of">
			<span class="stroke"></span>
			{#each denominator as ch, i (i)}
				<img class="glyph" src={glyphUrl(ch)} alt="" draggable="false" />
			{/each}
		</span>
	{/if}
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
		flex: 0 0 auto;
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

	/* A separator or compact suffix the glyphs have no drawing for: the site's type, a third of the glyph high. */
	.type {
		flex: 0 0 auto;
		align-self: flex-end;
		padding: 0 1px;
		font-family: var(--rt-font-web);
		font-size: max(11px, calc(var(--size) * 0.5));
		font-weight: 700;
		line-height: 1;
		color: var(--color-gold-shard);
		white-space: pre;
		margin-bottom: calc(var(--size) * 0.04);
	}

	/* The denominator: the same hand-drawn numerals at under a third of the
	   height, a touch faded, after a slash cut in the glyphs' own gold and ink. */
	.out-of {
		--out-h: calc(var(--size) * 0.3);
		display: inline-flex;
		align-items: flex-end;
		height: var(--out-h);
		gap: calc(var(--out-h) * -0.06);
		margin-left: calc(var(--size) * 0.1);
		/* The small glyphs' foot padding is smaller than the big ones'; this sets both on one baseline. */
		margin-bottom: calc(var(--size) * 0.022);
		opacity: 0.82;
	}

	.out-of,
	.out-of .glyph {
		flex: 0 0 auto;
	}

	.out-of .glyph {
		height: 100%;
	}

	.stroke {
		flex: 0 0 auto;
		align-self: center;
		width: calc(var(--out-h) * 0.17);
		height: calc(var(--out-h) * 1.05);
		margin-right: calc(var(--out-h) * 0.14);
		border-radius: calc(var(--out-h) * 0.1);
		background: var(--color-gold-shard);
		box-shadow: 0 0 0 max(1.5px, calc(var(--out-h) * 0.045)) var(--rt-bg);
		transform: skewX(-22deg);
	}
</style>
