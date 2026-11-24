import { formatTransparencyScore, isDrawn, type WeedsAttribute, type WeedsColumn, type WeedsKind, type WeedsRow } from "../whoWhatTypes";
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

/** The host of a link, the part a reader can judge at a glance; a link with no host reads as sent. */
export function linkLabel(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, "") || url;
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
	if (Array.isArray(v)) return v.length ? v.map((n) => (n.scientific ? `${n.name} ${n.scientific}` : n.name)).join(", ") : EMPTY;
	const aside = c.aside ? row[c.aside] : null;
	switch (c.kind) {
		case "money":
			return typeof v === "number" ? formatMoney(v, aside == null ? null : String(aside)) : formatCell(v, "text");
		case "points":
			return typeof v === "number" && typeof aside === "number"
				? m.ww_rating_weeds_points_of({ scored: number().format(v), available: number().format(aside) })
				: formatCell(v, "number");
		default:
			return formatCell(v, c.kind);
	}
}

const filled = (v: unknown) => v !== null && v !== undefined && v !== "";


/**
 * The drawn columns some row publishes, and those no row does, as the host
 * judged them on every row in scope: never the capped page or the filtered
 * rows, so neither the cap nor a filter can hide a column.
 */
export function splitPublished(columns: WeedsColumn[], filled: string[]): { shown: WeedsColumn[]; missing: WeedsColumn[] } {
	const drawn = columns.filter(isDrawn);
	const shown = drawn.filter((c) => filled.includes(c.key));
	return { shown, missing: drawn.filter((c) => !c.optional && !shown.includes(c)) };
}

/** The weeds bar: keeps rows where any drawn cell, as shown, or a link's full URL, contains the text. */
export function filterRows(rows: WeedsRow[], columns: WeedsColumn[], query: string): WeedsRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((row) =>
		columns.some((c) => {
			if (!isDrawn(c) || !filled(row[c.key])) return false;
			if (cellText(row, c).toLowerCase().includes(q)) return true;
			return c.kind === "link" && String(row[c.key]).toLowerCase().includes(q);
		}),
	);
}

/** An attribute's value as the table draws it: its example by kind, with its unit; a dash when none is sent. */
export function attributeText(a: Pick<WeedsAttribute, "example" | "kind" | "unit">): string {
	const v = a.example;
	if (Array.isArray(v)) return v.length ? v.map((n) => (n.scientific ? `${n.name} ${n.scientific}` : n.name)).join(", ") : EMPTY;
	if (a.kind === "money" && typeof v === "number") return formatMoney(v, a.unit);
	const text = formatCell(v, a.kind);
	return a.unit && typeof v === "number" ? `${text} ${a.unit}` : text;
}

/** The weeds bar on an attribute table: keeps the attributes whose name or value contains the text. */
export function filterAttributes<A extends WeedsAttribute>(attributes: A[], name: (a: A) => string, query: string): A[] {
	const q = query.trim().toLowerCase();
	if (!q) return attributes;
	return attributes.filter((a) => name(a).toLowerCase().includes(q) || (a.example != null && attributeText(a).toLowerCase().includes(q)));
}
