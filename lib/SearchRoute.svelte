<script lang="ts">
import { untrack, type Snippet } from "svelte";
import { goto } from "$app/navigation";
import type { WhoWhatEndpoints, WhoWhatRoutes } from "./whoWhatTypes";
import SearchPage from "./SearchPage.svelte";
import {
	loadOrgList,
	loadProjectList,
	loadTopKeys,
	recordSearchHit,
} from "./searchLists";
import { resolveSearchKey } from "./searchResolve";
import type { SearchListItem } from "./searchTypes";

// The tab is the route param: a switch keeps this tree mounted and only swaps
// the data. The results pages reuse this same component.
let {
	tab,
	title,
	initialQuery = "",
	results,
	routes = {},
	endpoints = {},
}: {
	tab: "orgs" | "projects";
	title: string;
	/** Pre-fills the bar on the results pages. */
	initialQuery?: string;
	/** Absent on the search page itself. */
	results?: Snippet;
	/** The host's URL map; absent, selecting a result goes nowhere. */
	routes?: WhoWhatRoutes;
	/** Absent, every list fetch is skipped. */
	endpoints?: WhoWhatEndpoints;
} = $props();

let orgs = $state<SearchListItem[]>([]);
let projects = $state<SearchListItem[]>([]);
let topKeys = $state<{ orgs: string[]; projects: string[] }>({ orgs: [], projects: [] });
let orgsLoaded = false;
let projectsLoaded = false;
let activated = false;
let listLoading = $state(false);

async function loadTab(which: "orgs" | "projects") {
	// Flag set BEFORE the await, or a focus plus the tab effect double-fetch.
	if (which === "orgs" ? orgsLoaded : projectsLoaded) return;
	if (which === "orgs") orgsLoaded = true;
	else projectsLoaded = true;

	listLoading = true;
	// Only the list is awaited; the ranking lands whenever it lands.
	loadTopKeys(fetch, endpoints, which).then((keys) => {
		topKeys = { ...topKeys, [which]: keys };
	});
	try {
		if (which === "orgs") orgs = await loadOrgList(fetch, endpoints);
		else projects = await loadProjectList(fetch, endpoints);
	} finally {
		listLoading = false;
	}
}

function activate() {
	activated = true;
	loadTab(tab);
}

$effect(() => {
	tab; // re-run when the tab changes
	if (activated) loadTab(tab);
});

// Idle warm-up; loadTab is idempotent, so a real interaction can't double-fetch.
$effect(() => {
	let idleHandle = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	if (typeof window.requestIdleCallback === "function") {
		idleHandle = window.requestIdleCallback(() => activate(), {
			timeout: 2000,
		});
	} else {
		timer = setTimeout(() => activate(), 200);
	}
	return () => {
		if (idleHandle) window.cancelIdleCallback?.(idleHandle);
		if (timer) clearTimeout(timer);
	};
});

// Seeded so SSR renders the bar already filled; the effect below owns every later change.
let query = $state(untrack(() => initialQuery));
let dropdownOpen = $state(false);
let selected = $state<SearchListItem | null>(null);
let notice = $state<string | null>(null);

// Reads only initialQuery, so typing never re-triggers it.
$effect(() => {
	query = initialQuery;
});

// "No match" while typing a correction would read as a live verdict on it.
$effect(() => {
	query;
	notice = null;
});

// No server-side free-text search: an unresolvable query stays put.
function submitSearch(q: string, t: "orgs" | "projects") {
	const items = t === "orgs" ? orgs : projects;

	if (!q.trim()) {
		notice = "Type a name, or open the list to browse.";
		return;
	}

	if (items.length === 0) {
		notice = "Still loading — try again in a moment.";
		return;
	}

	const key = resolveSearchKey(q, items, selected);
	if (!key) {
		notice = "No match — pick one from the list.";
		return;
	}

	notice = null;
	recordSearchHit(fetch, endpoints, t, key);
	const href =
		t === "orgs" ? routes.whoOrg?.(key) : routes.whatProject?.(key);
	// goto(undefined) throws.
	if (href) goto(href);
}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<SearchPage
	bind:query
	bind:dropdownOpen
	bind:selected
	{notice}
	activeTab={tab}
	{routes}
	{orgs}
	{projects}
	topKeys={topKeys[tab]}
	{listLoading}
	{results}
	onsearch={submitSearch}
	onpick={(item, t) => recordSearchHit(fetch, endpoints, t, item.key)}
	onactivate={activate}
/>