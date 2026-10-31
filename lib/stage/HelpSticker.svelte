<script lang="ts">
// Nick's info button as the control that plays a page's hand lesson. The
// page sizes it to the globe beside it; under reduced motion nothing animates,
// so the button is disabled rather than given a still variant.
import InfoRaw from "../assets/svg/rating/Rating_page_info_button.svg?raw";

let { playing, onpress }: { playing: boolean; onpress: () => void } = $props();

let reduced = $state(false);
$effect(() => {
	const mq = matchMedia("(prefers-reduced-motion: reduce)");
	const read = () => (reduced = mq.matches);
	read();
	mq.addEventListener("change", read);
	return () => mq.removeEventListener("change", read);
});
</script>

<button type="button" class="help-sticker" aria-label="Show me how this page works" aria-pressed={playing} disabled={reduced} onclick={onpress}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html InfoRaw}
</button>

<style>
	.help-sticker {
		display: block;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		background: none;
		appearance: none;
		cursor: pointer;
		color: inherit;
	}

	/* On a phone the hit box reaches past the art to 44px. */
	@media (max-width: 767px) {
		.help-sticker {
			position: relative;
		}

		.help-sticker::before {
			content: "";
			position: absolute;
			inset: min(-6px, calc(50% - 24px));
		}
	}

	.help-sticker:disabled {
		cursor: default;
	}

	.help-sticker :global(svg) {
		height: 100%;
		width: auto;
		display: block;
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.3))
			drop-shadow(4px 6px 12px rgb(12 8 1 / 0.42))
			drop-shadow(10px 14px 22px rgb(12 8 1 / 0.5));
		transition: filter 0.2s ease;
	}

	.help-sticker:not(:disabled):hover :global(svg),
	.help-sticker:focus-visible :global(svg) {
		filter:
			drop-shadow(1px 2px 6px rgb(12 8 1 / 0.34))
			drop-shadow(4px 8px 14px rgb(12 8 1 / 0.48))
			drop-shadow(12px 18px 28px rgb(12 8 1 / 0.56))
			brightness(1.18);
	}
</style>
