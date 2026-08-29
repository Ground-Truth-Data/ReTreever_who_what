// ⚠️ Never renumber an existing shard — numbers are names, allocated once; gaps from deletions stay retired, not recycled

export type ShardPage = 'search' | 'why';

export type ShardEntry = {
	/** the number — unique across the WHOLE SITE, never reused */
	n: number;
	/** which page it renders on; becomes the id prefix */
	page: ShardPage;
	/** slug for the DOM id, e.g. `polygons`; omitted for numbered artwork shards */
	slug?: string;
	/** what it actually is, for humans reading this table */
	what: string;
	/** artwork/poly number the piece draws — NOT the same as `n` once numbering went global */
	art?: number;
};

export const SHARDS: ShardEntry[] = [
	{ n: 1, page: 'search', what: 'hero shard, top-left long reach', art: 1 },
	{ n: 2, page: 'search', what: 'hero shard, corner punctuation', art: 2 },
	{ n: 3, page: 'search', what: 'hero shard, top-right small', art: 3 },
	{ n: 4, page: 'search', what: 'hero shard, upper-right medium', art: 4 },
	{ n: 5, page: 'search', what: 'hero shard, mid-right long reach', art: 5 },
	{ n: 6, page: 'search', what: 'hero shard (artwork 9), bottom-left', art: 9 },
	{ n: 7, page: 'search', what: 'hero shard (artwork 11), mid-left', art: 11 },

	{ n: 12, page: 'search', slug: 'headline', what: 'headline shard, right', art: 7 },
	{ n: 13, page: 'search', slug: 'headline', what: 'headline shard, left', art: 6 },
	{ n: 14, page: 'search', slug: 'headline', what: 'headline shard, lower-left', art: 10 },
	{ n: 15, page: 'search', slug: 'headline', what: 'headline shard, lower-right', art: 8 },

	{ n: 16, page: 'why', what: 'corner poly 1 (D_poly_1.svg)', art: 1 },
	{ n: 17, page: 'why', what: 'corner poly 2 (D_poly_2.svg)', art: 2 },
	{ n: 18, page: 'why', what: 'corner poly 3 (D_poly_3.svg)', art: 3 },
	{ n: 19, page: 'why', what: 'corner poly 4 (D_poly_4.svg)', art: 4 },

	{ n: 20, page: 'why', slug: 'frame', what: 'torn yellow outline behind the strips' },
	{ n: 21, page: 'why', slug: 'projects', what: 'Projects photo strip' },
	{ n: 22, page: 'why', slug: 'polygons', what: 'Polygons photo strip' },
	{ n: 23, page: 'why', slug: 'data', what: 'Data photo strip' },

	{ n: 24, page: 'why', slug: 'header', what: 'WHAT we do and WHY lockup' },
	{ n: 25, page: 'why', slug: 'affiliates', what: 'Affiliates panel' },

	// out of page order on purpose — numbers are allocated, never sorted; don't renumber to reorder
	{
		n: 26,
		page: 'search',
		slug: 'divider',
		what: 'middle divider — pine-seedling photo strip between hero and headline',
	},
];

/** DOM id for a shard: `<page>_shard-<n>[-<slug>]`; n is the name, slug/page are courtesies */
export function shardId(entry: ShardEntry): string {
	const base = `${entry.page}_shard-${entry.n}`;
	return entry.slug ? `${base}-${entry.slug}` : base;
}

/** Looks up a shard by number; throws instead of returning undefined so a typo fails loudly rather than rendering id="undefined" */
export function shard(n: number): ShardEntry {
	const found = SHARDS.find((s) => s.n === n);
	if (!found) {
		throw new Error(
			`No shard numbered ${n}. Numbers are allocated in shardIndex.ts; ` +
				`add an entry there rather than inventing one at the call site.`,
		);
	}
	return found;
}

/** Every shard on one page, in number order. */
export function shardsFor(page: ShardPage): ShardEntry[] {
	return SHARDS.filter((s) => s.page === page).sort((a, b) => a.n - b.n);
}

/** Map from artwork number to shard number for one page — bridges solver artwork numbers (which diverged from shard numbers) to the index */
export function byArt(page: ShardPage): Map<number, ShardEntry> {
	const m = new Map<number, ShardEntry>();
	for (const s of shardsFor(page)) if (s.art !== undefined) m.set(s.art, s);
	return m;
}
