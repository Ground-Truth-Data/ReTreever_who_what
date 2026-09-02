<script lang="ts">
import type { PageData } from "./$types";
import SearchRoute from "../../lib/SearchRoute.svelte";

let { data }: { data: PageData } = $props();

const OWN_ROUTES = { who: "/who", what: "/what" };
</script>

<SearchRoute
	tab={data.tab}
	routes={OWN_ROUTES}
	title={data.tab === "orgs" ? "Who — Organizations" : "What — Projects"}
/>
