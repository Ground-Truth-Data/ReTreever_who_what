<script lang="ts">
import { formatTransparencyScore } from "./whoWhatTypes";

// ⚠️ PLACEHOLDER BY DESIGN — the real results layout replaces this component.
let {
	name,
	rating,
	label = "Transparency Rating",
}: {
	name: string;
	/** 0–100 percentage, already converted server-side; null when unscored. */
	rating: number | null;
	label?: string;
} = $props();
</script>

<article class="result-card">
	<h2 class="result-name">{name}</h2>
	<p class="result-rating">
		<span class="result-label">{label}</span>
		<!-- ⚠️ Unscored is a real state — show a dash, not 0.0% (which reads as "scored terribly"). -->
		<span class="result-score">
			{rating === null ? "—" : formatTransparencyScore(rating)}
		</span>
	</p>
</article>

<style>
	/* Same black panel + gold border as the search dropdown right above it, so
	   the two read as one control stack rather than two visual languages. */
	.result-card {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 16px) clamp(12px, 2.5vw, 20px);
		background: #000;
		border: 3px solid #fad702;
		border-radius: 2px;
		text-align: center;
		/* The page's three-shadow recipe, lit from up-and-left like every other
		   sticker here, so the card rests ON the painted sky. */
		filter:
			drop-shadow(1px 2px 2px rgb(12 8 1 / 0.7))
			drop-shadow(4px 7px 8px rgb(12 8 1 / 0.55))
			drop-shadow(14px 20px 28px rgb(12 8 1 / 0.42));
	}

	/* Sized off --bar-scale (defined on .search-card, inherited here) rather
	   than a px literal, for the same reason .search-caption is: the search
	   bar's text is in SVG user units scaled to the card's width, so anything
	   that must sit level with it has to track that scale. */
	.result-name {
		margin: 0;
		color: var(--rtvr-on-dark);
		font-size: calc(17 * var(--bar-scale, 1));
		line-height: 1.25;
		font-weight: 600;
		word-break: break-word;
	}

	.result-rating {
		margin: calc(6 * var(--bar-scale, 1)) 0 0;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.5em;
		flex-wrap: wrap;
	}

	.result-label {
		color: #8d93a6;
		font-size: calc(13 * var(--bar-scale, 1));
	}

	/* ⚠️ Keep the `, inherit` fallback — if the OTF fails to load, the score degrades to readable body text instead of disappearing. */
	.result-score {
		font-family: var(--font-retreever, inherit);
		color: #fad702;
		font-size: calc(28 * var(--bar-scale, 1));
		line-height: 1.1;
	}

	/* ---- Mobile: 550px, the same breakpoint .search-caption uses ----
	   Below it the bar spans the whole screen, so "tracking the input" would
	   mean a headline-sized readout. Drop to fixed sizes there, exactly as the
	   caption does. */
	@media (max-width: 550px) {
		.result-name {
			font-size: 17px;
		}

		.result-label {
			font-size: 13px;
		}

		.result-score {
			font-size: 28px;
		}
	}
</style>