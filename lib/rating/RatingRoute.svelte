<script lang="ts">
import type { ScoreTally, WeedsTable, WhoWhatEndpoints, WhoWhatRoutes } from "../whoWhatTypes";
import type { SearchResult } from "./resultLoad";
import RatingPage from "./RatingPage.svelte";
import { setStageClipRoot } from "./DogStage.svelte";
import { loadOrgList, loadProjectList, recordSearchHit } from "../search/searchLists";
import { resolveSearchKey } from "../search/searchResolve";
import type { SearchListItem } from "../search/searchTypes";
import { curtain } from "../stage/curtain.svelte";

let {
	tab,
	result,
	routes = {},
	endpoints = {},
}: {
	tab: "orgs" | "projects";
	/** A value on a server render; a promise when the host streams it under the curtains. */
	result: SearchResult | Promise<SearchResult>;
	routes?: WhoWhatRoutes;
	endpoints?: WhoWhatEndpoints;
} = $props();

// Tagged with the promise it answers, so a new navigation's pending record
// never reads as the previous one's. A rejection is the host's to handle.
let streamed = $state.raw<{ of: Promise<SearchResult>; value: SearchResult } | null>(null);
const record = $derived(
	result instanceof Promise ? (streamed?.of === result ? streamed.value : null) : result,
);
$effect(() => {
	if (!(result instanceof Promise)) return;
	const of = result;
	of.then(
		(value) => {
			if (of === result) streamed = { of, value };
		},
		() => {},
	);
});

setStageClipRoot(endpoints.stageClipRoot);

// The top bar searches again from the rating page; the list warms up in idle time.
let items = $state<SearchListItem[]>([]);
let loaded = false;
let listLoading = $state(false);
let notice = $state<string | null>(null);

async function activate() {
	if (loaded) return;
	loaded = true;
	listLoading = true;
	try {
		items = tab === "orgs" ? await loadOrgList(fetch, endpoints) : await loadProjectList(fetch, endpoints);
	} finally {
		listLoading = false;
	}
}

// Reaching for the bar is when a pick, and its wipe, becomes likely; idle time here belongs to the dog.
function reach() {
	curtain.warm();
	void activate();
}

function pickItem(item: SearchListItem, go: boolean) {
	recordSearchHit(fetch, endpoints, tab, item.key);
	if (!go) return;
	const href = tab === "orgs" ? routes.whoOrg?.(item.key) : routes.whatProject?.(item.key);
	if (href) curtain.wipe(href);
}

const weedsHref = $derived.by(() => {
	const weeds = endpoints.weeds;
	const key = record?.key;
	return weeds && key ? (table: WeedsTable) => weeds(tab, key, table) : undefined;
});

// Fetched once the record is in, so the shell paints first; a miss or an
// unscored record simply leaves no tally.
let tally = $state.raw<ScoreTally | null>(null);
$effect(() => {
	const key = record?.key;
	const score = endpoints.score;
	tally = null;
	if (!key || !score) return;
	let live = true;
	fetch(score(tab, key))
		.then((res) => (res.ok ? (res.json() as Promise<ScoreTally>) : null))
		.then((answer) => {
			if (live && answer?.scored) tally = answer;
		})
		.catch(() => {});
	return () => {
		live = false;
	};
});

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
	{#if record}
		<title>{record.name} | ReTreever</title>
	{/if}
</svelte:head>

<!-- Keyed per navigation: a rating-to-rating pick starts the bar, the dog and the reveal over. -->
{#key result}
	<RatingPage
		{tab}
		{record}
		{routes}
		{notice}
		{items}
		{listLoading}
		clipRoot={endpoints.clipRoot}
		onsearch={search}
		onpick={pickItem}
		onactivate={reach}
		{weedsHref}
		{tally}
		onopenproject={tab === "orgs" ? openProject : undefined}
	/>
{/key}
