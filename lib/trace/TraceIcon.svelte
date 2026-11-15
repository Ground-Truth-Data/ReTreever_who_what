<script lang="ts" module>
export type TraceIconName = "trophy" | "times" | "scale" | "sigma" | "layers";
</script>

<script lang="ts">
let { name }: { name: TraceIconName } = $props();
</script>

<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === "trophy"}
		<path d="M7 4h10v5a5 5 0 0 1-10 0z" />
		<path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 4.4M17 6h2.5a2.5 2.5 0 0 1-2.6 4.4" />
		<path d="M12 14v3M8.5 20.5h7M10 17h4l.6 3.5h-5.2z" />
	{:else if name === "times"}
		<path d="M6 6l12 12M18 6L6 18" />
	{:else if name === "scale"}
		<path d="M12 3v17M7 20.5h10M5 7h14M12 4.5 5 7M12 4.5 19 7" />
		<path d="M2.5 14 5 7.5 7.5 14a2.6 2.6 0 0 1-5 0zM16.5 14 19 7.5l2.5 6.5a2.6 2.6 0 0 1-5 0z" />
	{:else if name === "sigma"}
		<path d="M18 7V4H6l6 8-6 8h12v-3" />
	{:else}
		<path d="M12 3 2 8l10 5 10-5z" />
		<path d="m2 13 10 5 10-5M2 17.5l10 5 10-5" />
	{/if}
</svg>

<style>
	svg {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
