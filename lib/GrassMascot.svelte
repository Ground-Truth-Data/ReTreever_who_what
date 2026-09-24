<script lang="ts">
import { cn } from "./cn";
import mascotSprite from "./assets/pub-Rtvr/animations/mascot-run-sprite.webp";

let {
	class: className = "",
	ground = "divider",
	idleDelay = 4000,
}: {
	class?: string;
	/** `divider` = slanted strip top edge, `grass` = flat wildflower band. */
	ground?: "divider" | "grass";
	/** Quiet time before he trots past, in ms. */
	idleDelay?: number;
} = $props();

// {#key lap} remounts the element so a finished CSS animation replays.
let run = $state(false);
let lap = $state(0);

$effect(() => {
	// Must not read anything it writes (`lap += 1` reads lap): infinite re-run.
	const delay = idleDelay;
	let timer: ReturnType<typeof setTimeout>;
	let released: ReturnType<typeof setTimeout>;
	let running = false;
	let n = 0; // kept OUT of the graph

	// No mousemove: a resting cursor twitch would starve the idle timer forever.
	const EVENTS = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"];

	const arm = () => {
		clearTimeout(timer);
		clearTimeout(released);
		running = false;
		run = false;
		timer = setTimeout(() => {
			running = true;
			n += 1;
			lap = n; // WRITE only
			run = true;
			// Without this he runs once per page load.
			released = setTimeout(() => {
				running = false;
			}, 6000);
		}, delay);
	};

	const onActivity = () => {
		// Don't interrupt mid-stride.
		if (!running) arm();
	};

	arm();
	for (const e of EVENTS) {
		addEventListener(e, onActivity, { passive: true });
	}

	// A backgrounded tab must not burn its idle timer.
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

<!-- 24fps 12-frame 4x3 sprite. -->
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
	/* Keep in sync with DOG_W_MIN/DOG_W_VW/DOG_W_MAX in GrassTufts.svelte
	   (reading it back via getComputedStyle locked up the renderer). */
	:global(:root) {
		--dog-w: clamp(190px, 38vw, 680px);
	}

	/* Must not clip: most of the dog's body sits above this box. */
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
		/* The one knob (0.55s = natural trot). To make him linger, widen --dog-w;
		   slowing this reads as slow motion. A fixed crossing duration would
		   match the gait at one window width only. */
		--dog-leg: 0.55s;
		--dog-travel: calc((125 * 1vw) + var(--dog-w));
		--dog-cross: calc(var(--dog-leg) * var(--dog-travel) / var(--dog-w));
		/* One crossing; the leg-cycle count is intentionally fractional. */
		animation:
			mascotLegCycle var(--dog-leg) step-end calc(var(--dog-travel) / var(--dog-w)),
			mascotCross var(--dog-cross) linear 1 forwards;
	}

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

	/* Only X: rotate applies before transform, so translateX already carries the
	   tilt and a translateY would double-count it. The end must clear --dog-w
	   or he's parked on-screen for good. */
	@keyframes mascotCross {
		0% {
			transform: translateX(120vw);
		}
		100% {
			transform: translateX(calc(-1 * var(--dog-w) - 5vw));
		}
	}

	/* NO prefers-reduced-motion gate — repo law. */
</style>
