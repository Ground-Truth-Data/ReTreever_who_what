import type { SearchListItem } from "./searchTypes";

export function normalizeQuery(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveSearchKey(
	query: string,
	items: SearchListItem[],
	selected?: SearchListItem | null,
): string | null {
	const q = normalizeQuery(query);
	if (!q) return null;

	if (selected && normalizeQuery(selected.name) === q) {
		return selected.key;
	}

	const exact = items.find((item) => normalizeQuery(item.name) === q);
	if (exact) return exact.key;

	const partial = items.filter((item) =>
		normalizeQuery(item.name).includes(q),
	);
	return partial.length === 1 ? partial[0].key : null;
}
