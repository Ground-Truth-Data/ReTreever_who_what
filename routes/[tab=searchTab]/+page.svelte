<script lang="ts">
import type { load } from "./+page";
import SearchRoute from "../../lib/search/SearchRoute.svelte";
import { m } from "$parent/src/lib/paraglide/messages";

let { data }: { data: ReturnType<typeof load> } = $props();

const OWN_ROUTES = { who: "/who", what: "/what" };
</script>

<SearchRoute
	tab={data.tab}
	routes={OWN_ROUTES}
	title={data.tab === "orgs" ? m.ww_search_title_who() : m.ww_search_title_what()}
/>
