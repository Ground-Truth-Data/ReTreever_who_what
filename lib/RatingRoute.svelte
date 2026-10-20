<script lang="ts">
import type { WeedsTable, WhoWhatEndpoints, WhoWhatRoutes } from "./whoWhatTypes";
import type { SearchResult } from "./resultLoad";
import RatingPage from "./RatingPage.svelte";
import { loadOrgList, loadProjectList, loadTopKeys, recordSearchHit } from "./searchLists";
import { resolveSearchKey } from "./searchResolve";
import type { SearchListItem } from "./searchTypes";
import { curtain } from "./curtain.svelte";

let {
	tab,
	result,
	routes = {},
	endpoints = {},
}: {
	tab: "orgs" | "projects";
	result: SearchResult;
	routes?: WhoWhatRoutes;
	endpoints?: WhoWhatEndpoints;
} = $props();

// The top bar searches again from the rating page; the list warms up in idle time.
let items = $state<SearchListItem[]>([]);
let topKeys = $state<string[]>([]);
let loaded = false;
let listLoading = $state(false);
let notice = $state<string | null>(null);

async function activate() {
	if (loaded) return;
	loaded = true;
	listLoading = true;
	loadTopKeys(fetch, endpoints, tab).then((keys) => {
		topKeys = keys;
	});
	try {
		items = tab === "orgs" ? await loadOrgList(fetch, endpoints) : await loadProjectList(fetch, endpoints);
	} finally {
		listLoading = false;
	}
}

function pickItem(item: SearchListItem, go: boolean) {
	recordSearchHit(fetch, endpoints, tab, item.key);
	if (!go) return;
	const href = tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);
	if (href) curtain.wipe(href);
}

const weeds = $derived(endpoints.weeds);
const weedsHref = $derived(weeds ? (table: WeedsTable) => weeds(tab, result.key, table) : undefined);

function openProject(projectKey: string) {
	const href = routes.whatProject?.(projectKey);
	if (href) curtain.wipe(href);
}

$effect(() => {
	const idle = window.requestIdleCallback?.(() => activate(), { timeout: 2000 });
	const timer = idle === undefined ? setTimeout(() => activate(), 200) : undefined;
	return () => {
		if (idle !== undefined) window.cancelIdleCallback?.(idle);
		if (timer) clearTimeout(timer);
	};
});

function search(q: string) {
	if (!q.trim()) {
		notice = "Type a name to search again.";
		return;
	}
	if (items.length === 0) {
		notice = "Still loading — try again in a moment.";
		return;
	}
	const key = resolveSearchKey(q, items, null);
	if (!key) {
		notice = "No match — try the full name.";
		return;
	}
	notice = null;
	recordSearchHit(fetch, endpoints, tab, key);
	const href = tab === "orgs" ? routes.whoOrg?.(key) : routes.whatProject?.(key);
	if (href) curtain.wipe(href);
}
</script>

<svelte:head>
	<title>{result.name} | ReTreever</title>
</svelte:head>

<RatingPage
	{tab}
	{result}
	{routes}
	{notice}
	{items}
	{topKeys}
	{listLoading}
	clipRoot={endpoints.clipRoot}
	onsearch={search}
	onpick={pickItem}
	onactivate={activate}
	{weedsHref}
	onopenproject={tab === "orgs" ? openProject : undefined}
/>
