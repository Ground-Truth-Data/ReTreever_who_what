<script lang="ts">
import { cn } from "./cn";
// Imported, not a host URL — see the note in GlobeSpinIcon.svelte.
import mascotSprite from "./assets/pub-Rtvr/animations/mascot-run-sprite.webp";

let {
	class: className = "",
	ground = "divider",
	idleDelay = 4000,
}: {
	class?: string;
	/** Which surface the dog runs on: `divider` = slanted strip top edge, `grass` = flat wildflower band. */
	ground?: "divider" | "grass";
	/** Quiet time before he trots past, in ms. */
	idleDelay?: number;
} = $props();

// Runs ONE lap after idleDelay; the {#key} in the markup remounts the element so a finished CSS animation replays from frame 0.
let run = $state(false);
let lap = $state(0);

$effect(() => {
	// ⚠️ Effect must not depend on anything it also writes (e.g. `lap += 1` reads lap) — caused an infinite re-run freeze twice.
	const delay = idleDelay;
	let timer: ReturnType<typeof setTimeout>;
	let released: ReturnType<typeof setTimeout>;
	let running = false;
	let n = 0; // plain counter — the {#key} value, kept OUT of the graph

	// No mousemove in EVENTS — a resting cursor twitch would starve the idle timer forever.
	const EVENTS = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"];

	const arm = () => {
		clearTimeout(timer);
		clearTimeout(released);
		running = false;
		run = false;
		timer = setTimeout(() => {
			running = true;
			n += 1;
			lap = n; // WRITE only — never `lap += 1`, which would read it
			run = true;
			// Releases the guard after the lap so a later quiet spell can trigger another run — without it he only ever runs once per page load.
			released = setTimeout(() => {
				running = false;
			}, 6000);
		}, delay);
	};

	const onActivity = () => {
		// Don't interrupt mid-stride — let the current lap finish before requiring a fresh quiet spell.
		if (!running) arm();
	};

	arm();
	for (const e of EVENTS) {
		addEventListener(e, onActivity, { passive: true });
	}

	// Re-arms on tab return so a backgrounded tab doesn't burn its idle timer.
	const onVisibility = () => {
		if (document.visibilityState === "visible" && !running) arm();
	};
	document.addEventListener("visibilitychange", onVisibility);

	return () => {
		clearTimeout(timer);
		clearTimeout(released);
		for (const e of EVENTS) removeEventListener(e, onActivity);
		document.removeEventListener("visibilitychange", onVisibility);
	};
});
</script>

<!-- 24fps run-cycle sprite (12-frame, 4x3 grid); see agents/skills/frame-sequence-sprite-animation for how it was built. -->
<div
	class={cn("mascot-track", className)}
	aria-hidden="true"
	style="--mascot-sprite: url({mascotSprite})"
>
	{#key lap}
		{#if run}
			<div class="mascot-run" class:on-grass={ground === "grass"}></div>
		{/if}
	{/key}
</div>

<style>
	/* ⚠️ Dog's width — GrassTufts.svelte duplicates these as DOG_W_MIN/DOG_W_VW/DOG_W_MAX to space the tufts; keep in sync (reading it back via getComputedStyle instead locked up the renderer). */
	:global(:root) {
		--dog-w: clamp(190px, 38vw, 680px);
	}

	/* ⚠️ Must not clip — most of the dog's body sits above this box; horizontal overflow is clipped by the page's overflow-x: hidden instead. */
	.mascot-track {
		position: absolute;
		inset: 0;
		overflow: visible;
		pointer-events: none;
	}

	.mascot-run {
		position: absolute;
		bottom: 89.68%;
		left: 0;
		width: var(--dog-w);
		aspect-ratio: 438 / 280;
		rotate: 0.65deg;
		background-image: var(--mascot-sprite, var(--rtvr-missing-art));
		background-repeat: no-repeat;
		background-size: 400% 300%;
		/* ⚠️ crossDur is DERIVED from --dog-travel/--dog-w/--dog-leg, not hardcoded — a fixed duration only matches the gait at one window width. */
		/* --dog-leg is the free knob (0.55s = natural trot); to make him linger, widen --dog-w rather than slowing this — slower reads as slow motion. */
		--dog-leg: 0.55s;
		/* --dog-travel: distance mascotCross covers; single source of truth for both the duration and the leg-cycle count (see mascotCross). */
		--dog-travel: calc((125 * 1vw) + var(--dog-w));
		--dog-cross: calc(var(--dog-leg) * var(--dog-travel) / var(--dog-w));
		/* ⚠️ ONE crossing only (ends via `forwards`, no loop). Leg-cycle iteration count is DERIVED (--dog-travel / --dog-w) and intentionally fractional — don't round it or swap in `infinite`/`1`. */
		animation:
			mascotLegCycle var(--dog-leg) step-end calc(var(--dog-travel) / var(--dog-w)),
			mascotCross var(--dog-cross) linear 1 forwards;
	}

	/* Flat ground: drops the strip's 0.65° tilt (which would otherwise sink the dog while crossing) and grounds the feet in the grass. */
	.mascot-run.on-grass {
		bottom: 0%;
		rotate: 0deg;
	}

	@keyframes mascotLegCycle {
		0% {
			background-position: 0% 0%;
		}
		8.3333% {
			background-position: 33.3333% 0%;
		}
		16.6667% {
			background-position: 66.6667% 0%;
		}
		25% {
			background-position: 100% 0%;
		}
		33.3333% {
			background-position: 0% 50%;
		}
		41.6667% {
			background-position: 33.3333% 50%;
		}
		50% {
			background-position: 66.6667% 50%;
		}
		58.3333% {
			background-position: 100% 50%;
		}
		66.6667% {
			background-position: 0% 100%;
		}
		75% {
			background-position: 33.3333% 100%;
		}
		83.3333% {
			background-position: 66.6667% 100%;
		}
		91.6667% {
			background-position: 100% 100%;
		}
	}

	/* ⚠️ Only X is animated — `rotate` applies before `transform`, so this translateX already carries the 0.65° tilt; adding translateY would double-count it and sink the dog. End position must clear the dog's full --dog-w (up to 72vw) or he's left parked on-screen for good — derive it, don't guess. */
	@keyframes mascotCross {
		0% {
			transform: translateX(120vw);
		}
		100% {
			transform: translateX(calc(-1 * var(--dog-w) - 5vw));
		}
	}

	/* NO prefers-reduced-motion gate — repo law, see GlobeSpinIcon.svelte. */
</style>
