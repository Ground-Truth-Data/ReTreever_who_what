// ⚠️ Never renumber an existing shard — numbers are names, allocated once; gaps from deletions stay retired, not recycled

export type ShardPage = 'search' | 'why';

export type ShardEntry = {
	/** unique across the WHOLE SITE, never reused */
	n: number;
	page: ShardPage;
	slug?: string;
	what: string;
	/** artwork number drawn; not the same as `n` */
	art?: number;
};

// 1–15 and 27–36 were the search and rating pages' polygon cut-outs, removed 30 Oct 2026.
export const SHARDS: ShardEntry[] = [
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

	{
		n: 26,
		page: 'search',
		slug: 'divider',
		what: 'middle divider — pine-seedling photo strip between hero and headline',
	},
];

/** `<page>_shard-<n>[-<slug>]` */
export function shardId(entry: ShardEntry): string {
	const base = `${entry.page}_shard-${entry.n}`;
	return entry.slug ? `${base}-${entry.slug}` : base;
}

/** Throws so a typo fails loudly rather than rendering id="undefined". */
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
