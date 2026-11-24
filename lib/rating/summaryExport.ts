// The rating's summary as a CSV, built in the browser from the tally the page
// already holds: the record, the six figures and each table's points, never a
// record row. The site is a window on the data, not a download of it.
import type { ScoreTally } from "../whoWhatTypes";
import { TABLE_LABELS } from "../weeds/tallyMath";
import { m } from "$parent/src/lib/paraglide/messages";

export type SummaryInput = { name: string; url: string; tally: ScoreTally };
type Row = [section: string, figure: string, value: string, outOf: string];

// Spreadsheet numbers: no grouping, a "." decimal, whatever the page's language.
const num = (n: number | null | undefined, digits?: number) =>
	n === null || n === undefined || !Number.isFinite(n) ? "" : digits === undefined ? String(n) : n.toFixed(digits);

function claimValue(tally: ScoreTally): string {
	if (tally.kind === "project") return "";
	const ratio = tally.org?.reviewed ? tally.org.ratio : null;
	return ratio === null || ratio === undefined ? "1" : String(Math.min(1, ratio));
}

/** The export's rows, header first; every row has four cells. */
export function summaryRows({ name, url, tally }: SummaryInput): Row[] {
	const counts = tally.attributes;
	const record = m.ww_rating_export_section_record();
	const summary = m.ww_rating_export_section_summary();
	const tables = m.ww_rating_export_section_tables();
	return [
		[m.ww_rating_export_col_section(), m.ww_rating_export_col_figure(), m.ww_rating_export_col_value(), m.ww_rating_export_col_out_of()],
		[record, m.ww_rating_export_name(), name, ""],
		[record, m.ww_rating_export_page(), url, ""],
		[record, m.ww_rating_export_run(), tally.scoredAt?.slice(0, 10) ?? "", ""],
		[summary, m.ww_rating_tally_possible(), num(counts?.possible), ""],
		[summary, m.ww_rating_tally_filled(), num(counts?.filled), num(counts?.possible)],
		[summary, m.ww_rating_tally_share(), counts && counts.possible > 0 ? num((counts.filled / counts.possible) * 100, 1) : "", counts ? "100" : ""],
		[summary, m.ww_rating_tally_step_claims(), claimValue(tally), ""],
		[summary, m.ww_rating_export_place(), num(tally.place?.rank), num(tally.place?.of)],
		[summary, m.ww_rating_tally_rating(), num(tally.rating, 1), "100"],
		...tally.tables.map((t): Row => [tables, TABLE_LABELS[t.table], num(t.awarded), num(t.available)]),
	];
}

const cell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);

/** RFC 4180: quoted where needed, CRLF after every row. */
export function summaryCsv(input: SummaryInput): string {
	return summaryRows(input)
		.map((r) => r.map(cell).join(",") + "\r\n")
		.join("");
}

/** "plant-for-the-planet-rating.csv": the record's name, folded to plain ASCII. */
export function summaryFileName(name: string): string {
	const slug = name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return `${slug || "record"}-rating.csv`;
}

/** Hands the reader the summary as a file. A BOM first, so a spreadsheet reads the accents as UTF-8. */
export function downloadSummary(input: SummaryInput): void {
	const blob = new Blob(["﻿", summaryCsv(input)], { type: "text/csv;charset=utf-8" });
	const href = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = href;
	a.download = summaryFileName(input.name);
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(href), 0);
}
