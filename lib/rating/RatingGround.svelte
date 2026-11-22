<script lang="ts">
// The rating pages' land: the golden sky with its faint pines, the crest and
// the wildflower grass, and the ground under them, drawn once here so the
// rating page and its score page stand on the same hills. The hero's height
// is the page's: `short` hugs its words, so what lies underground shows on
// the first screen.
import type { Snippet } from "svelte";
import groundUrl from "../assets/pub-Rtvr/rating/ground.webp";
import skyUrl from "../assets/golden_sky_background.webp";
import pineUrl from "../assets/pub-Rtvr/rating/poly/rp-pine.webp";
import pinePhoneUrl from "../assets/pub-Rtvr/rating/poly/rp-pine-1366.webp";
import Greenery from "../stage/Greenery.svelte";

let {
	hero,
	underground,
	grass = undefined,
	before = undefined,
	after = undefined,
	short = false,
	hasTally = false,
	pageEl = $bindable(null),
	heroEl = $bindable(null),
	undergroundEl = $bindable(null),
}: {
	hero: Snippet;
	underground: Snippet;
	/** What stands in the grass, between its back and front layers (the dog). */
	grass?: Snippet;
	/** Laid over the page from its top, before the hero (the number's follower). */
	before?: Snippet;
	after?: Snippet;
	short?: boolean;
	/** The weeds' tally takes the left margin from 1100px up. */
	hasTally?: boolean;
	pageEl?: HTMLElement | null;
	heroEl?: HTMLElement | null;
	undergroundEl?: HTMLElement | null;
} = $props();
</script>

<div class="rating-page" style="--art-sky: url({skyUrl}); --art-pine: url({pineUrl}); --art-pine-phone: url({pinePhoneUrl}); --art-ground: url({groundUrl});" bind:this={pageEl}>
	{@render before?.()}
	<section class="rating-hero" class:short bind:this={heroEl}>
		<Greenery flat>{@render grass?.()}</Greenery>
		{@render hero()}
	</section>

	<div class="underground" class:has-tally={hasTally} bind:this={undergroundEl}>
		{@render underground()}
	</div>
	{@render after?.()}
</div>

<style>
	.rating-page {
		--pad: clamp(16px, 3vw, 40px);
		--art: min(100vw, 1200px);
		--greenery-h: clamp(170px, calc(var(--art) * 0.3), 36vh);
		--upper-band: calc(var(--greenery-h) * 0.87);
		/* The soil runs this far up under the grass, and the grass bases fade into it. */
		--soil-overlap: calc(var(--upper-band) * 0.22);
		position: relative;
		min-height: calc(100vh - 5rem);
		width: 100%;
		background: #0b1109;
		overflow-x: clip;
	}

	/* The foot is the search hero's crest and grass, lower here so the dog and
	   the number stand on the crest; the bottom padding is what keeps them off
	   the grass. Capped at 900px or a tall monitor opens sky between them. */
	.rating-hero {
		--stage-w: clamp(200px, 34vw, 480px);
		--stage-h: calc(var(--stage-w) * 900 / 940);
		--dog-lift: calc(var(--soil-overlap) - var(--stage-h) * 20 / 900);
		position: relative;
		width: 100%;
		box-sizing: border-box;
		min-height: min(100vh - 5rem, 900px);
		padding: clamp(20px, 4vh, 48px) var(--pad) calc(var(--greenery-h) * 0.55);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(20px, 4vh, 48px);
		background-color: #cc9f47;
		background-image: var(--art-sky, var(--rtvr-missing-art));
		background-size: cover;
		background-position: center top;
		isolation: isolate;
		z-index: 1;
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - var(--soil-overlap)), transparent);
		mask-image: linear-gradient(to bottom, #000 calc(100% - var(--soil-overlap)), transparent);
	}

	/* No dog to stand on the crest: the words sit over the grass, which still
	   needs its own height under them. */
	.rating-hero.short {
		min-height: 0;
		padding-bottom: calc(var(--greenery-h) * 0.8);
		gap: 0;
	}

	/* The comp's sky carries the pine pattern faintly behind everything. */
	.rating-hero::before {
		content: "";
		position: absolute;
		inset: 0;
		background-image: var(--art-pine);
		background-size: 1366px 1024px;
		opacity: 0.05;
		pointer-events: none;
		z-index: 0;
	}

	/* Below the grass the page is underground: one ground picture, drawn once
	   and never mirrored or repeated, under the lockup and the weeds; a wash
	   of the page's dark keeps the stickers and the tabs legible on it. It is
	   as wide as the page and at least as tall as the pinned scene (a screen,
	   or the pin's 520px floor under the head), so a narrow screen crops its
	   sides. */
	.underground {
		--ground-w: max(100%, calc(max(100dvh, 860px) * 986 / 712));
		position: relative;
		margin-top: calc(var(--soil-overlap) * -1);
		padding-top: var(--soil-overlap);
	}

	/* The weeds pin paints the same ground, shifted by where it starts, so
	   it is seamless until it pins and then holds still while the tabs walk. */
	.underground,
	.underground :global(.weeds-pin) {
		background:
			linear-gradient(rgb(11 17 9 / 0.3), rgb(11 17 9 / 0.3)),
			var(--art-ground) center var(--soil-y, 0px) / var(--ground-w) auto no-repeat,
			#0b1109;
	}

	.underground :global(.weeds-pin) {
		--soil-y: calc(var(--soil-overlap) * -1);
	}

	/* The tally stands in the left margin from 1100px up (WeedsTally's own
	   breakpoint); the stage gives it that column and leans half as far the
	   other way, so it still reads as centred under the head. */
	@media (min-width: 1100px) {
		.underground.has-tally {
			--stage-room: 340px;
		}

		.underground.has-tally :global(.weeds-lean) {
			padding-left: var(--stage-room);
			padding-right: calc(var(--stage-room) / 2);
		}
	}

	/* Under 1100px the tally is a strip fixed at the screen's foot; the pinned
	   stage ends above it. 48px + its bottom padding is WeedsTally's `.strip`. */
	@media (max-width: 1099px) {
		.underground.has-tally :global(.weeds-pin) {
			box-sizing: border-box;
			padding-bottom: calc(48px + max(8px, env(safe-area-inset-bottom, 0px)));
		}
	}

	/* At 5% opacity the faint pine needs no more than a 1x tile on a phone. */
	@media (max-width: 767px) {
		.rating-hero::before {
			background-image: var(--art-pine-phone, var(--art-pine));
		}
	}

	/* One column: the hero hugs its content, since a phone's 100vh is taller
	   than what a reader sees. The padding is the stage's top plus a quarter
	   stage; the -64px raises the dog's head behind the crest to just under
	   the number's foot (the grid stacks over the dog); any more and it
	   reaches the number. That puts the whole dog on the first screen. */
	@media (max-width: 720px) {
		.rating-hero {
			min-height: 0;
			padding-bottom: calc(var(--dog-lift) + var(--stage-h) * 1.265 - 64px);
		}

		.rating-hero.short {
			padding-bottom: var(--greenery-h);
		}
	}

	/* A phone: the header shares its row with the globe and the help sticker,
	   so the bar spans the screen at the search page's size. */
	@media (max-width: 720px) {
		.rating-hero {
			padding-top: 16px;
			gap: 10px;
		}

		.rating-hero.short {
			gap: 0;
		}
	}
</style>
