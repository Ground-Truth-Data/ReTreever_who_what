<script lang="ts">
import { dev } from "$app/environment";
import type { PageData } from "./$types";
import SearchRoute from "../../lib/SearchRoute.svelte";
import EphemeralCard from "$rig/dev/EphemeralCard.svelte";
import EphemeralDock from "$rig/dev/EphemeralDock.svelte";

let { data }: { data: PageData } = $props();

const OWN_ROUTES = { who: "/who", what: "/what" };
</script>

<SearchRoute
	tab={data.tab}
	routes={OWN_ROUTES}
	title={data.tab === "orgs" ? "Who — Organizations" : "What — Projects"}
/>
<!-- Gated at the CALL SITE, not only inside the dock. EphemeralDock and
     EphemeralCard each carry their own `{#if dev}`, which stops them
     rendering but cannot stop them shipping: an unconditional mount is a
     live reference the bundler must keep, so the dev card and devCard.css
     travelled into production builds. A component gating itself can never
     delete its own call site — only the caller can. -->
{#if dev}
	<EphemeralDock side="left"><EphemeralCard title="who_what" /></EphemeralDock>
{/if}
