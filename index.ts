// Public surface of ReTreever_who_what — everything a host may import lives here, nothing else.

export { default as SearchRoute } from "./lib/search/SearchRoute.svelte";

export { loadOrganization, loadProject } from "./lib/rating/resultLoad";
export type { SearchResult } from "./lib/rating/resultLoad";

export { SHARDS, shard, shardId, shardsFor, byArt } from "./lib/stage/shardIndex";
export type { ShardEntry, ShardPage } from "./lib/stage/shardIndex";

export { toTransparencyScore, formatTransparencyScore } from "./lib/whoWhatTypes";
export { ratingState } from "./lib/rating/ratingState";
export type { RatingState } from "./lib/rating/ratingState";
export type {
	WhoWhatEndpoints,
	WhoWhatFail,
	WhoWhatRoutes,
} from "./lib/whoWhatTypes";
