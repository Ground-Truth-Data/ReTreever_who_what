<script lang="ts">
// THE RAPPER SHELL for this child lives inside the child because SvelteKit only
// builds layouts from kit.files.routes — a +layout.svelte in rapper itself is
// never loaded. Everything it does is TierShell's; this file only names the child.
import TierShell from "$parent/retreeved/sharedComponents/TierShell.svelte";
import logoUrl from "$parent/retreeved/sharedAssets/ReTreever_logo_sm.webp";

// Written by the installer, one per rapper. views stays empty — a stale view
// list drifts from the routes it names.
const CHILD = { name: "who_what", owner: "Get Cache", repo: "ReTreever_who_what", views: [] };

let { children } = $props();
</script>

<TierShell child={CHILD} logo={logoUrl} phone={false}>
	{@render children()}
</TierShell>
