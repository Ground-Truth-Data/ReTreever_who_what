import { formatTransparencyScore, type WeedsColumn, type WeedsKind, type WeedsRow } from "../whoWhatTypes";
import { getLocale } from "$parent/src/lib/paraglide/runtime";
import { m } from "$parent/src/lib/paraglide/messages";

export const EMPTY = "—";

const numbers = new Map<string, Intl.NumberFormat>();
function number(): Intl.NumberFormat {
	const locale = getLocale();
	let format = numbers.get(locale);
	if (!format) numbers.set(locale, (format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })));
	return format;
}

const cents = new Map<string, Intl.NumberFormat>();
function twoPlaces(): Intl.NumberFormat {
	const locale = getLocale();
	let format = cents.get(locale);
	if (!format) cents.set(locale, (format = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })));
	return format;
}

// The money law: every dollar is a plain "$", never US$ or CA$; € and £ keep
// theirs; any other currency, R$ included, reads its code after the number.
const OWN_SIGNS = new Set(["$", "€", "£"]);

/** "€8.00", "$8.00", "8.00 KES"; no code is the bare amount. */
export function formatMoney(amount: number, code: string | null | undefined): string {
	if (code) {
		try {
			const money = new Intl.NumberFormat(getLocale(), { style: "currency", currency: code, currencyDisplay: "narrowSymbol" });
			const sign = money.formatToParts(amount).find((p) => p.type === "currency")?.value;
			if (sign && OWN_SIGNS.has(sign)) return money.format(amount);
		} catch {
			// Not an ISO code: shown as published.
		}
	}
	const shown = twoPlaces().format(amount);
	return code ? `${shown} ${code}` : shown;
}

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
			return typeof value === "number" ? number().format(value) : String(value);
		case "score":
			return formatTransparencyScore(value);
		case "link":
			return linkLabel(String(value));
		default:
			return String(value);
	}
}

/** The text a cell shows, read with the `aside` value it carries. */
export function cellText(row: WeedsRow, c: WeedsColumn): string {
	const v = row[c.key];
	const aside = c.aside ? row[c.aside] : null;
	switch (c.kind) {
		case "money":
			return typeof v === "number" ? formatMoney(v, aside == null ? null : String(aside)) : formatCell(v, "text");
		case "points":
			return typeof v === "number" && typeof aside === "number"
				? m.ww_rating_weeds_points_of({ scored: number().format(v), available: number().format(aside) })
				: formatCell(v, "number");
		case "site":
			return filled(v) ? String(v) : filled(aside) ? m.ww_rating_weeds_unnamed_site() : EMPTY;
		default:
			return formatCell(v, c.kind);
	}
}

/** A column the table draws; `key`, `dead` and `aside` ride along unseen. */
export const isDrawn = (c: WeedsColumn): boolean => c.kind !== "key" && c.kind !== "dead" && c.kind !== "aside";

const filled = (v: unknown) => v !== null && v !== undefined && v !== "";

/** A site with no description still shows, by its id. */
const publishes = (row: WeedsRow, c: WeedsColumn) =>
	filled(row[c.key]) || (c.kind === "site" && !!c.aside && filled(row[c.aside]));

/**
 * The drawn columns some row publishes, and those no row does. Judged on every
 * row the table has, never the filtered ones, so a filter cannot hide a column.
 */
export function splitPublished(columns: WeedsColumn[], rows: WeedsRow[]): { shown: WeedsColumn[]; missing: WeedsColumn[] } {
	const drawn = columns.filter(isDrawn);
	const shown = drawn.filter((c) => rows.some((r) => publishes(r, c)));
	return { shown, missing: drawn.filter((c) => !c.optional && !shown.includes(c)) };
}

/** When the row's link answered 404/410, the day it was checked; else null and the link is live. */
export function deadOn(row: WeedsRow, columns: WeedsColumn[]): string | null {
	const at = columns.find((c) => c.kind === "dead");
	const v = at && row[at.key];
	return v ? formatWeedsDate(String(v)) : null;
}

/** The weeds bar: keeps rows where any drawn cell, as shown, as a link's full URL or as a site's id, contains the text. */
export function filterRows(rows: WeedsRow[], columns: WeedsColumn[], query: string): WeedsRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((row) =>
		columns.some((c) => {
			if (!isDrawn(c)) return false;
			if (!publishes(row, c)) return false;
			if (cellText(row, c).toLowerCase().includes(q)) return true;
			const full = c.kind === "link" ? row[c.key] : c.kind === "site" && c.aside ? row[c.aside] : null;
			return filled(full) && String(full).toLowerCase().includes(q);
		}),
	);
}
