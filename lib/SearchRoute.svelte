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

// ⚠️ The tab IS the route param (/retreeve/who vs /retreeve/what, both served by [tab=searchTab]) — a tab switch keeps this whole tree mounted, only the data swaps. The results pages reuse this same component (passing `results` + `initialQuery`) rather than a second copy that could drift.
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
	/** Pre-fills the bar — the results pages show what was searched for. */
	initialQuery?: string;
	/** The results card; absent on the search page itself. */
	results?: Snippet;
	/**
	 * The host's URL map. ReTreever passes its AppRoutes; rapper passes
	 * nothing, and selecting a result then goes nowhere rather than to a 404.
	 */
	routes?: WhoWhatRoutes;
	/** rapper passes nothing and every list fetch is skipped rather than aimed at a 404. */
	endpoints?: WhoWhatEndpoints;
} = $props();

let orgs = $state<SearchListItem[]>([]);
let projects = $state<SearchListItem[]>([]);
/** Most-searched keys per tab; orders the empty-query dropdown. */
let topKeys = $state<{ orgs: string[]; projects: string[] }>({ orgs: [], projects: [] });
let orgsLoaded = false;
let projectsLoaded = false;
let activated = false;
let listLoading = $state(false);

async function loadTab(which: "orgs" | "projects") {
	// ⚠️ Flag set BEFORE the await, or a focus + the tab effect can double-fetch.
	if (which === "orgs" ? orgsLoaded : projectsLoaded) return;
	if (which === "orgs") orgsLoaded = true;
	else projectsLoaded = true;

	listLoading = true;
	// The list is what the page waits on; the ranking rides beside it and lands whenever it lands.
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

/** First focus / list-open: load the active tab's rows. */
function activate() {
	activated = true;
	loadTab(tab);
}

$effect(() => {
	tab; // re-run when the tab changes
	if (activated) loadTab(tab);
});

// ⚠️ loadTab is idempotent, so this idle warm-up and a real hover/focus interaction can't double-fetch.
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

// ⚠️ Seeded from the prop (not an effect) so SSR renders the bar already filled — an effect alone pops the name in after hydration. untrack: genuinely one-time, the effect below owns every later change.
let query = $state(untrack(() => initialQuery));
let dropdownOpen = $state(false);
/** The dropdown row the user last clicked; see SearchPage's `selected`. */
let selected = $state<SearchListItem | null>(null);
let notice = $state<string | null>(null);

// ⚠️ Reads only `initialQuery`, so typing never re-triggers it — a plain initialiser would leave the previous org's name in the bar when the route's subject changes.
$effect(() => {
	query = initialQuery;
});

// Retires the last submit's message on edit — "No match" while typing a correction reads as a live verdict on it, which it isn't.
$effect(() => {
	query;
	notice = null;
});

// ⚠️ No server-side free-text search — an unresolvable query stays put with a message rather than navigating to a guessed key and 404ing.
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
	// ⚠️ No host URL map → do nothing, silently — goto(undefined) throws.
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
	onactivate={activate}
/>