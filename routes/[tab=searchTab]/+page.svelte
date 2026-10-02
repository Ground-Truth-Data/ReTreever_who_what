<script lang="ts">
import type { load } from "./+page";
import SearchRoute from "../../lib/SearchRoute.svelte";

let { data }: { data: ReturnType<typeof load> } = $props();

const OWN_ROUTES = { who: "/who", what: "/what" };
</script>

<SearchRoute
	tab={data.tab}
	routes={OWN_ROUTES}
	title={data.tab === "orgs" ? "Who — Organizations" : "What — Projects"}
/>
