<script lang="ts">
// The crest and the wildflower band a page's hero ends in, bottom-anchored in
// the positioned section that mounts it; the section sets --greenery-h and
// --upper-band. Children stand between the grass's back and front layers.
// `ridge` adds the far blue-black hills behind the crest: the designer painted
// them as a band with no layer of their own, so they are the crest's own
// silhouette, masked and filled with the ink, shifted and stretched into a
// second range.
import type { Snippet } from "svelte";
import GrassTufts from "./GrassTufts.svelte";
import hillPatternWebp from "../assets/hill_pattern.webp";
import hillPatternAvif from "../assets/hill_pattern.avif";
import upperGrassFrontWebp from "../assets/pub-Rtvr/home/uppergrass_front.webp";
import upperGrassFrontAvif from "../assets/pub-Rtvr/home/uppergrass_front.avif";
import upperGrassBackWebp from "../assets/pub-Rtvr/home/uppergrass_back.webp";
import upperGrassBackAvif from "../assets/pub-Rtvr/home/uppergrass_back.avif";
import hillPatternPhone from "../assets/hill_pattern-1290.avif";
import upperGrassFrontPhone from "../assets/pub-Rtvr/home/uppergrass_front-1290.avif";
import upperGrassBackPhone from "../assets/pub-Rtvr/home/uppergrass_back-1290.avif";

let { children, ridge = false }: { children?: Snippet; ridge?: boolean } = $props();
</script>

<!-- Missing asset falls through to --rtvr-missing-art. -->
<div
	class="greenery"
	aria-hidden="true"
	style="--art-hill-pattern-webp: url({hillPatternWebp}); --art-hill-pattern-avif: url({hillPatternAvif}); --art-uppergrass-front-webp: url({upperGrassFrontWebp}); --art-uppergrass-front-avif: url({upperGrassFrontAvif}); --art-uppergrass-back-webp: url({upperGrassBackWebp}); --art-uppergrass-back-avif: url({upperGrassBackAvif}); --art-hill-pattern-phone: url({hillPatternPhone}); --art-uppergrass-front-phone: url({upperGrassFrontPhone}); --art-uppergrass-back-phone: url({upperGrassBackPhone});"
>
	{#if ridge}
		<div class="ridge">
			<span class="far left"></span>
			<span class="far right"></span>
			<span class="rim"></span>
			<span class="near"></span>
		</div>
	{/if}
	<div class="crest"></div>
	<!-- Back to front: black wash, green wash, children, then tufts (a runner passes BEHIND some). -->
	<div class="wildflower-band">
		{@render children?.()}
		<GrassTufts />
	</div>
</div>

<style>
	/* No z-index: the crest and the band stack in the section's own context. */
	.greenery {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.ridge {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--greenery-h);
		z-index: 0;
	}

	/* Every piece is the crest's alpha as a mask over a flat fill, at the crest's
	   own size and position, so the range moves with the hill it hides behind. */
	.ridge > span {
		position: absolute;
		inset: 0 -12%;
		background: var(--rtvr-ink, #171d31);
		-webkit-mask-image: var(--art-hill-pattern-webp);
		mask-image: var(--art-hill-pattern-webp);
		-webkit-mask-size: 100% auto;
		mask-size: 100% auto;
		-webkit-mask-position: top center;
		mask-position: top center;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		transform-origin: 50% 100%;
	}

	/* A thin band: the far lobes and the lip are the blue, the near body the ink
	   in front of them, so only their tops show as a blue edge above the crest. */
	.ridge > .far,
	.ridge > .rim {
		background: var(--rtvr-ridge, #143a68);
	}

	.ridge > .far.left {
		transform: translate(-6%, -3.5%) scaleX(1.04);
	}

	.ridge > .far.right {
		transform: translate(7%, -2.5%) scaleX(1.03);
	}

	.ridge > .rim {
		transform: translateY(-2%) scale(1.006, 1.025);
	}

	.ridge > .near {
		transform: translateY(-1%) scale(1.004, 1.012);
	}

	/* Each background: plain WebP, then image-set() with AVIF first — Safari <
	   16.4 drops the image-set line and keeps the WebP. */
	/* 100% auto keeps the crest's drawn proportion; the file always exceeds the box. */
	.crest {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--greenery-h);
		z-index: 0;
		background-repeat: no-repeat;
		background-image: var(--art-hill-pattern-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-hill-pattern-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-hill-pattern-webp, var(--rtvr-missing-art)) type("image/webp")
		);
		background-size: 100% auto;
		background-position: top center;
	}

	/* No bottom mask: the blade bases dissolve into the page on their own. */
	.wildflower-band {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--upper-band);
		z-index: 3;
	}

	/* Numbered: ::after paints above ordinary children by default and would
	   otherwise cover the children and tufts. */
	.wildflower-band::before,
	.wildflower-band::after {
		content: "";
		position: absolute;
		inset: 0;
		background-size: 100% 100%;
		background-position: center bottom;
		background-repeat: no-repeat;
	}

	.wildflower-band :global(.mascot-track) {
		z-index: 2;
	}

	.wildflower-band :global(.tuft-layer) {
		z-index: 3;
	}

	/* Black silhouette BEHIND green: the children stack between the two pseudos. */
	.wildflower-band::before {
		z-index: 0;
		background-image: var(--art-uppergrass-front-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-uppergrass-front-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-uppergrass-front-webp, var(--rtvr-missing-art)) type("image/webp")
		);
	}

	.wildflower-band::after {
		z-index: 1;
		background-image: var(--art-uppergrass-back-webp, var(--rtvr-missing-art));
		background-image: image-set(
			var(--art-uppergrass-back-avif, var(--rtvr-missing-art)) type("image/avif"),
			var(--art-uppergrass-back-webp, var(--rtvr-missing-art)) type("image/webp")
		);
	}

	/* A phone gets art sized for 430px at 3x; old Safari keeps the plain WebP lines above. */
	@media (max-width: 480px) {
		.crest {
			background-image: image-set(
				var(--art-hill-pattern-phone, var(--rtvr-missing-art)) type("image/avif"),
				var(--art-hill-pattern-webp, var(--rtvr-missing-art)) type("image/webp")
			);
		}

		.wildflower-band::before {
			background-image: image-set(
				var(--art-uppergrass-front-phone, var(--rtvr-missing-art)) type("image/avif"),
				var(--art-uppergrass-front-webp, var(--rtvr-missing-art)) type("image/webp")
			);
		}

		.wildflower-band::after {
			background-image: image-set(
				var(--art-uppergrass-back-phone, var(--rtvr-missing-art)) type("image/avif"),
				var(--art-uppergrass-back-webp, var(--rtvr-missing-art)) type("image/webp")
			);
		}
	}
</style>
