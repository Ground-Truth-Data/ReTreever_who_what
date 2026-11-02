<script lang="ts">
import { cn } from "../cn";
import globeSprite from "../assets/pub-Rtvr/animations/globe-spin-sprite.webp";
import { m } from "$parent/src/lib/paraglide/messages";

let { class: className = "", href }: { class?: string; href?: string } = $props();
</script>

<!-- 3fps 6-frame 3x2 sprite. The host names the map's route; without one the globe is decoration, not a link. -->
<svelte:element
	this={href ? "a" : "span"}
	{href}
	aria-label={href ? m.ww_rating_explore_map() : undefined}
	class={cn("globe-spin-link", className)}
>
	<div class="globe-spin" style="--globe-sprite: url({globeSprite})"></div>
</svelte:element>

<style>
	.globe-spin-link {
		display: inline-flex;
		transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.globe-spin-link:hover,
	.globe-spin-link:focus-visible {
		transform: scale(1.14) rotate(-5deg);
	}

	.globe-spin {
		width: 100%;
		aspect-ratio: 213 / 160;
		background-image: var(--globe-sprite, var(--rtvr-missing-art));
		background-repeat: no-repeat;
		background-size: 300% 200%;
		animation: globeRotate 2s step-end infinite;
	}

	@keyframes globeRotate {
		0% {
			background-position: 0% 0%;
		}
		16.6667% {
			background-position: 50% 0%;
		}
		33.3333% {
			background-position: 100% 0%;
		}
		50% {
			background-position: 0% 100%;
		}
		66.6667% {
			background-position: 50% 100%;
		}
		83.3333% {
			background-position: 100% 100%;
		}
	}

	/* On a phone the hit box reaches past the art to 44px. */
	@media (max-width: 767px) {
		.globe-spin-link {
			position: relative;
		}

		.globe-spin-link::before {
			content: "";
			position: absolute;
			inset: min(-6px, calc(50% - 24px));
		}
	}

	/* NO prefers-reduced-motion gate — repo law. */
</style>
