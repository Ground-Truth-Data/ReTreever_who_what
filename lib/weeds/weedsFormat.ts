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

const counts = new Map<string, Intl.NumberFormat>();
function compactFormat(): Intl.NumberFormat {
	const locale = getLocale();
	let format = counts.get(locale);
	if (!format) counts.set(locale, (format = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })));
	return format;
}

/** A whole count grouped for the reader's language: "226,619". */
export function fullCount(n: number): string {
	return number().format(Math.round(n));
}

/** A whole count short enough for the tally: grouped below five digits, compact from there ("226.6K", fr "226,6 k"). */
export function shortCount(n: number): string {
	const whole = Math.round(n);
	return Math.abs(whole) >= 10_000 ? compactFormat().format(whole) : fullCount(whole);
}

const SYMBOLS = ["", "K", "M", "B", "T"];
const tenths = new Map<string, Intl.NumberFormat>();

/** A figure rounded to its symbol, for a sticker: "3.8K", "1.2M", "4B", "2.5T". The symbols are the same in every language; the decimal mark is the reader's (fr "3,8K"). */
export function symbolCount(n: number): string {
	let step = 0;
	let scaled = n;
	// Rounded before each test, so 999,950 is "1M" and never "1000K".
	while (step < SYMBOLS.length - 1 && Math.round(Math.abs(scaled) * 10) / 10 >= 1000) {
		scaled /= 1000;
		step++;
	}
	const locale = getLocale();
	let format = tenths.get(locale);
	if (!format) tenths.set(locale, (format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })));
	return format.format(scaled) + SYMBOLS[step];
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
		case "score": {
			const shown = formatTransparencyScore(value);
			return shown === EMPTY ? EMPTY : `${shown}/100`;
		}
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

/** When the row's link answered 404/410, the day it was checked and, if the check ever saw it alive, the last day it did; else null and the link is live. */
export function deadOn(row: WeedsRow, columns: WeedsColumn[]): { checked: string; alive: string | null } | null {
	const at = columns.find((c) => c.kind === "dead");
	const v = at && row[at.key];
	if (!v) return null;
	// null means not seen alive since the column landed (18 Nov 2026), not never alive: the line then names no date.
	const alive = at.aside ? row[at.aside] : null;
	return { checked: formatWeedsDate(String(v)), alive: alive ? formatWeedsDate(String(alive)) : null };
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
