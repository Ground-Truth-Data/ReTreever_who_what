import { formatTransparencyScore, type WeedsColumn, type WeedsKind, type WeedsRow } from "./whoWhatTypes";

export const EMPTY = "—";

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** `2024/7/12`, the comp's spelling; UTC so a midnight date never slips a day. */
export function formatWeedsDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** The host of a link, the part a reader can judge at a glance. */
export function linkLabel(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}

/** The text a cell shows; a link cell shows its host. */
export function formatCell(value: string | number | null | undefined, kind: WeedsKind): string {
	if (value === null || value === undefined || value === "") return EMPTY;
	switch (kind) {
		case "date":
			return formatWeedsDate(String(value));
		case "number":
			return typeof value === "number" ? number.format(value) : String(value);
		case "score":
			return formatTransparencyScore(value);
		case "link":
			return linkLabel(String(value));
		default:
			return String(value);
	}
}

/** The weeds bar: keeps rows where any cell, as shown or as a link's full URL, contains the text. */
export function filterRows(rows: WeedsRow[], columns: WeedsColumn[], query: string): WeedsRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((row) =>
		columns.some((c) => {
			const v = row[c.key];
			if (v === null || v === undefined) return false;
			if (formatCell(v, c.kind).toLowerCase().includes(q)) return true;
			return c.kind === "link" && String(v).toLowerCase().includes(q);
		}),
	);
}
