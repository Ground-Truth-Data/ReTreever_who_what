<script lang="ts">
/**
 * The child's own /who and /what — its two declared views, each with a real
 * url, served by ONE route.
 *
 * WHAT IT PASSES, AND WHY THAT IS THE WHOLE POINT. `routes` names where the
 * tabs link: they are this child's own paths, so it can supply them without
 * knowing anything about a parent. That is what lights the Projects tab up —
 * it was grey because nothing ever gave it an href, not because the component
 * lacked the feature.
 *
 * `endpoints` is still absent, deliberately. That is the parent's API surface
 * and this child has no parent, so the dropdown lists stay empty and selecting
 * a result goes nowhere. The trailer unhitched: plainer, fewer features, still
 * standing.
 */
import type { PageData } from "./$types";
import SearchRoute from "../../lib/SearchRoute.svelte";

let { data }: { data: PageData } = $props();

/** This child's OWN urls. No parent named, nothing injected — a solo clone
 *  gets working tabs, which it never had while both views shared "/". */
const OWN_ROUTES = { who: "/who", what: "/what" };
</script>

<SearchRoute
	tab={data.tab}
	routes={OWN_ROUTES}
	title={data.tab === "orgs" ? "Who — Organizations" : "What — Projects"}
/>
