<script lang="ts">
import { untrack } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import { localizeHref } from "$parent/src/lib/paraglide/runtime";
import { curtain } from "../stage/curtain.svelte";
import type { WhoWhatEndpoints, WhoWhatRoutes } from "../whoWhatTypes";
import SearchPage from "./SearchPage.svelte";
import { loadOrgList, loadProjectList, recordSearchHit } from "./searchLists";
import { resolveSearchKey } from "./searchResolve";
import type { SearchListItem } from "./searchTypes";

let {
	tab,
	title,
	initialQuery = "",
	routes = {},
	endpoints = {},
}: {
	tab: "orgs" | "projects";
	title: string;
	/** Pre-fills the bar on the results pages. */
	initialQuery?: string;
	/** The host's URL map; absent, selecting a result goes nowhere. */
	routes?: WhoWhatRoutes;
	/** Absent, every list fetch is skipped. */
	endpoints?: WhoWhatEndpoints;
} = $props();

let orgs = $state<SearchListItem[]>([]);
let projects = $state<SearchListItem[]>([]);
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
	try {
		if (which === "orgs") orgs = await loadOrgList(fetch, endpoints);
		else projects = await loadProjectList(fetch, endpoints);
	} finally {
		listLoading = false;
	}
}

function activate() {
	activated = true;
	curtain.warm();
	loadTab(tab);
}

$effect(() => {
	tab;
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

let query = $state(untrack(() => initialQuery));
let dropdownOpen = $state(false);
let selected = $state<SearchListItem | null>(null);
let notice = $state<string | null>(null);

$effect(() => {
	query = initialQuery;
});

$effect(() => {
	query;
	notice = null;
});

function pickItem(item: SearchListItem, t: "orgs" | "projects", go: boolean) {
	recordSearchHit(fetch, endpoints, t, item.key);
	if (!go) return;
	const href = t === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);
	if (href) curtain.wipe(localizeHref(href));
}

function submitSearch(q: string, t: "orgs" | "projects") {
	const items = t === "orgs" ? orgs : projects;

	if (!q.trim()) {
		notice = m.ww_search_notice_empty_query();
		return;
	}

	if (items.length === 0) {
		notice = m.ww_search_notice_loading();
		return;
	}

	const key = resolveSearchKey(q, items, selected);
	if (!key) {
		notice = m.ww_search_notice_no_match();
		return;
	}

	notice = null;
	recordSearchHit(fetch, endpoints, t, key);
	const href =
		t === "orgs" ? routes.whoOrg?.(key) : routes.whatProject?.(key);
	if (href) curtain.wipe(localizeHref(href));
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
	{listLoading}
	clipRoot={endpoints.clipRoot}
	onsearch={submitSearch}
	onpick={pickItem}
	onactivate={activate}
/>