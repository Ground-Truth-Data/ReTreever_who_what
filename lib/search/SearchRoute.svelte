<script lang="ts">
import { untrack } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import { localizeHref } from "$parent/src/lib/paraglide/runtime";
import { holdPickedName } from "../rating/pickedName";
import { curtain } from "../stage/curtain.svelte";
import type { WhoWhatEndpoints, WhoWhatRoutes } from "../whoWhatTypes";
import SearchPage from "./SearchPage.svelte";
import { LiveList } from "./liveList.svelte";
import { loadMostViewed, loadOrgList, loadProjectList, recordSearchHit, SEARCH_ORDERS, type SearchOrder } from "./searchLists";
import { searchOrder } from "./SearchTools.svelte";
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

// One pair per order: the server caps a list at its first page, so another order is another page.
const byOrder = Object.fromEntries(
	SEARCH_ORDERS.map((order) => [
		order,
		{
			orgs: new LiveList((q, signal) => loadOrgList(fetch, endpoints, q, signal, order)),
			projects: new LiveList((q, signal) => loadProjectList(fetch, endpoints, q, signal, order)),
		},
	]),
) as Record<SearchOrder, { orgs: LiveList; projects: LiveList }>;
const lists = $derived(byOrder[searchOrder.by]);
let activated = false;
let mostViewed = $state<SearchListItem[]>([]);

$effect(() => {
	const t = tab;
	// Aborted on leaving, or the browser cancels it into a "Failed to fetch" no loader can tell from an outage.
	const leaving = new AbortController();
	void loadMostViewed(fetch, endpoints, t, leaving.signal).then((items) => {
		if (!leaving.signal.aborted) mostViewed = items;
	});
	return () => leaving.abort();
});

function activate() {
	activated = true;
	curtain.warm();
	void lists[tab].now(query);
}

$effect(() => {
	const words = query;
	const list = lists[tab];
	if (activated) list.ask(words);
});

// A new order is a click, not typing: ask at once.
$effect(() => {
	const now = lists;
	if (activated) untrack(() => void now[tab].now(query));
});

// Idle warm-up; now() skips words already asked, so a real interaction can't double-fetch.
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
	open(t, item.key, item.name);
}

function open(t: "orgs" | "projects", key: string, name: string | undefined) {
	const href = t === "orgs" ? routes.whoOrg?.(key) : routes.whatProject?.(key);
	if (!href) return;
	holdPickedName(localizeHref(href), name);
	curtain.wipe(localizeHref(href));
}

async function submitSearch(q: string, t: "orgs" | "projects") {
	if (!q.trim()) {
		notice = m.ww_search_notice_empty_query();
		return;
	}

	const answer = lists[t].now(q);
	if (lists[t].loading) notice = m.ww_search_notice_loading();
	const items = await answer;

	const key = resolveSearchKey(q, items, selected);
	if (!key) {
		notice = m.ww_search_notice_no_match();
		return;
	}

	notice = null;
	recordSearchHit(fetch, endpoints, t, key);
	open(t, key, (selected?.key === key ? selected : items.find((item) => item.key === key))?.name);
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
	orgs={lists.orgs.items}
	projects={lists.projects.items}
	{mostViewed}
	listLoading={lists[tab].loading}
	clipRoot={endpoints.clipRoot}
	onsearch={submitSearch}
	onpick={pickItem}
	onactivate={activate}
/>