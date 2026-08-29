<script lang="ts">
// Sparse scatter of grass clumps drawn in front of the mascot (occluders with gaps, not a full-bleed wash) — generated, not hand-placed, so it stays even at any width.

let {
	class: className = "",
	/** Average gap between tufts, as a fraction of viewport width. */
	spacing = null,
	/** Tuft height as a fraction of the band's height. */
	scale = 1,
}: {
	class?: string;
	spacing?: number | null;
	scale?: number;
} = $props();

// ⚠️ Viewport width via `innerWidth`, NOT bind:clientWidth/getComputedStyle — measuring rendered content creates a measure→re-render feedback loop that froze the renderer (tab wouldn't even close).
let vw = $state(0);

$effect(() => {
	const read = () => {
		vw = window.innerWidth;
	};
	read();
	addEventListener("resize", read, { passive: true });
	return () => removeEventListener("resize", read);
});

// ⚠️ DOG_W_* mirror GrassMascot's --dog-w clamp — duplicated on purpose (reading it via getComputedStyle caused the freeze above); keep them in sync.
const DOG_W_MIN = 190;
const DOG_W_VW = 0.38;
const DOG_W_MAX = 680;
const dogWidth = $derived(
	vw > 0 ? Math.min(Math.max(DOG_W_MIN, DOG_W_VW * vw), DOG_W_MAX) : 0,
);

/** Gap between tufts, as a fraction of the layer width. */
const DENSITY = 3;
const gapFraction = $derived(
	spacing ?? (vw > 0 ? dogWidth / vw / DENSITY : 0.38 / DENSITY),
);

/** 14 clump cutouts (both hands); each keeps its own aspect ratio — cutouts run 1.02:1 to 1.48:1, a shared ratio squashed the tall ones. All are 320px wide, so ratio = 320 / height. */
const CLUMPS: { n: number; h: number }[] = [
	{ n: 3, h: 216 },
	{ n: 4, h: 314 },
	{ n: 5, h: 261 },
	{ n: 6, h: 309 },
	{ n: 7, h: 227 },
	{ n: 8, h: 304 },
	{ n: 9, h: 253 },
];

// ⚠️ Uses import.meta.glob (build-time import), NOT a template-string URL — an assembled `/pub-Rtvr/...` path 404s outside ReTreever and can't be grepped/found by the build.
const TUFT_URLS = import.meta.glob<string>(
	"./assets/pub-Rtvr/home/tufts/*.webp",
	{ eager: true, query: "?url", import: "default" },
);

/** `tuft-4-flipped` -> its built URL. Keyed by name, not by path. */
function tuft(name: string): string {
	const hit = Object.entries(TUFT_URLS).find(([p]) =>
		p.endsWith(`/${name}.webp`),
	);
	return hit ? hit[1] : "";
}

const ART = CLUMPS.flatMap((c) =>
	["", "-flipped"].map((v) => ({
		src: tuft(`tuft-${c.n}${v}`),
		ratio: 320 / c.h,
	})),
);

// ⚠️ Seeded integer-hash, not Math.random() (would mismatch server/client hydration) and not the sin-based one-liner (too smooth at consecutive seeds — picked the same clump repeatedly).
function rand(seed: number): number {
	let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

// Jittered-grid scatter: regular grid at `spacing`, each tuft offset up to ±40% of a cell — even coverage without a fence-like rhythm.
// Positions run -5% to 110% so the row doesn't visibly start/end inside the viewport.
const positions = $derived.by(() => {
	const step = gapFraction * 100;
	const out: {
		left: number;
		src: string;
		ratio: number;
		h: number;
		z: number;
	}[] = [];

	// Shuffled bag, not independent picks — `ART[floor(rand()*14)]` per tuft repeats almost immediately (birthday problem) and duplicates are glaring here; shuffle all 14, deal in order, reshuffle only when empty.
	const bag = ART.map((a, i) => ({ a, k: rand(i * 101 + 7) }))
		.sort((p, q) => p.k - q.k)
		.map((p) => p.a);

	for (let i = 0, x = -5; x < 110; i++, x += step) {
		const r1 = rand(i * 3 + 1);
		const r3 = rand(i * 3 + 3);
		const art = bag[i % bag.length];
		out.push({
			left: x + (r1 - 0.5) * step * 0.8,
			src: art.src,
			ratio: art.ratio,
			// Height reads as depth (nearer = taller); deliberately small (18-40% of band) — taller reads as a wall, not tufts.
			h: (18 + r3 * 22) * scale,
			// A few sit fractionally lower so they overlap each other.
			z: r3 > 0.6 ? 1 : 0,
		});
	}
	return out;
});
</script>

<div class="tuft-layer {className}" aria-hidden="true">
	{#each positions as t, i (i)}
		<img
			src={t.src}
			alt=""
			decoding="async"
			class="tuft"
			style:left="{t.left}%"
			style:height="{t.h}%"
			style:aspect-ratio={t.ratio}
			style:z-index={t.z}
		/>
	{/each}
</div>

<style>
	/* Sits in the band's own stacking context, above the mascot child. */
	.tuft-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	/* ⚠️ `width: auto` alone measures ZERO here — an absolutely-positioned replaced element with a % height has no definite height to derive auto width from, so it collapsed invisibly; each element's own `aspect-ratio` fixes it. Also: translateX(-50%) makes `left` the tuft's centre, matching the scatter maths above. */
	.tuft {
		position: absolute;
		bottom: 0;
		width: auto;
		object-fit: contain;
		object-position: bottom center;
		transform: translateX(-50%);
		user-select: none;
	}
</style>
