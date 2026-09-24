<script lang="ts">
// Lives in the child: SvelteKit builds layouts only from kit.files.routes.
import Layout from "$rig/Layout.svelte";
import logoUrl from "$rt/assets/ReTreever_logo_sm.webp";

// views stays empty: a stale list drifts from the routes it names.
const CHILD = { name: "who_what", owner: "Get Cache", repo: "ReTreever_who_what", views: [] };

let { children } = $props();
</script>

<Layout child={CHILD} logo={logoUrl}>
	{@render children()}
</Layout>
