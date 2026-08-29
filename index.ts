// Public surface of ReTreever_who_what — everything a host may import lives here, nothing else.

export { default as SearchRoute } from "./lib/SearchRoute.svelte";
export { default as ResultCard } from "./lib/ResultCard.svelte";

export { loadOrganization, loadProject } from "./lib/resultLoad";
export type { SearchResult } from "./lib/resultLoad";

export { SHARDS, shard, shardId, shardsFor, byArt } from "./lib/shared/shardIndex";
export type { ShardEntry, ShardPage } from "./lib/shared/shardIndex";

export { toTransparencyScore, formatTransparencyScore } from "./lib/whoWhatTypes";
export type {
	WhoWhatEndpoints,
	WhoWhatFail,
	WhoWhatRoutes,
} from "./lib/whoWhatTypes";
