<script lang="ts">
// A figure in the designer's numerals that counts up once when `run` turns
// true. The final figure holds the width from first paint, so the count
// moves nothing; without script, or with reduced motion, it is just the figure.
import RatingNumber from "../rating/RatingNumber.svelte";

let {
	value,
	format,
	run = false,
	outOf = undefined,
	label,
}: {
	value: number;
	format: (n: number) => string;
	run?: boolean;
	outOf?: number;
	label: string;
} = $props();

const COUNT_MS = 900;
let shown = $state<number | null>(null);
let started = false;
let raf = 0;

// Started once, outside the effect's own life: `run` is re-read whenever the
// page's scroll state moves, and a rerun must not stop a count under way.
function count(target: number) {
	const start = performance.now();
	const step = (now: number) => {
		const t = Math.min(1, (now - start) / COUNT_MS);
		shown = t < 1 ? target * (1 - (1 - t) ** 3) : null;
		raf = t < 1 ? requestAnimationFrame(step) : 0;
	};
	shown = 0;
	raf = requestAnimationFrame(step);
}

$effect(() => {
	if (!run || started) return;
	started = true;
	if (!matchMedia("(prefers-reduced-motion: reduce)").matches) count(value);
});
$effect(() => () => cancelAnimationFrame(raf));

const finalText = $derived(format(value));
// Counted in the figure's own decimals, so "0.82" counts as "0.00", "0.01", …
const liveText = $derived.by(() => {
	if (shown === null) return finalText;
	const decimals = (finalText.split(".")[1] ?? "").replace(/\D.*$/, "").length;
	return shown.toFixed(decimals);
});
</script>

<span class="count">
	<span class="hold" aria-hidden="true"><RatingNumber text={finalText} {outOf} /></span>
	<!-- Keyed: each step of the count is new glyphs, never the old ones moved, so the count is no layout shift. -->
	{#key liveText}
		<span class="live"><RatingNumber text={liveText} {outOf} {label} /></span>
	{/key}
</span>

<style>
	.count {
		position: relative;
		display: inline-flex;
		line-height: 1;
	}

	.hold {
		visibility: hidden;
		display: inline-flex;
	}

	.live {
		position: absolute;
		left: 0;
		bottom: 0;
		display: inline-flex;
		white-space: nowrap;
	}
</style>
