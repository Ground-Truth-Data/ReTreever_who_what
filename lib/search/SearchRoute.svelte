<script lang="ts">
import { untrack } from "svelte";
import { m } from "$parent/src/lib/paraglide/messages";
import { localizeHref } from "$parent/src/lib/paraglide/runtime";
import { curtain } from "../stage/curtain.svelte";
import type { WhoWhatEndpoints, WhoWhatRoutes } from "../whoWhatTypes";
import SearchPage from "./SearchPage.svelte";
import { LiveList } from "./liveList.svelte";
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

const lists = {
	orgs: new LiveList((q, signal) => loadOrgList(fetch, endpoints, q, signal)),
	projects: new LiveList((q, signal) => loadProjectList(fetch, endpoints, q, signal)),
};
let activated = false;

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
	const href = t === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);
	if (href) curtain.wipe(localizeHref(href));
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
	orgs={lists.orgs.items}
	projects={lists.projects.items}
	listLoading={lists[tab].loading}
	clipRoot={endpoints.clipRoot}
	onsearch={submitSearch}
	onpick={pickItem}
	onactivate={activate}
/>