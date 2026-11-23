const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Futura Medium's advance widths in hundredths of an em, a–z then A–Z; an accented letter takes its base letter's.
const LOWER = "60 60 48 60 55 30 60 55 25 25 50 25 79 55 60 60 60 37 41 27 54 50 77 56 54 54".split(" ").map(Number);
const UPPER = "74 59 70 73 57 51 84 73 29 41 66 44 96 84 89 54 89 60 58 48 74 68 106 62 60 63".split(" ").map(Number);
const advance = (ch: string) => {
	const c = ch.normalize("NFD").charCodeAt(0);
	if (c >= 97 && c <= 122) return LOWER[c - 97] / 100;
	if (c >= 65 && c <= 90) return UPPER[c - 65] / 100;
	return ch === "-" ? 0.22 : 0.31;
};
const ems = (s: string) => [...s].reduce((w, ch) => w + advance(ch), 0);
const num = (re: RegExp, s: string) => {
	const hit = re.exec(s);
	return hit ? Number(hit[1]) : null;
};

type Word = { start: number; end: number; text: string; x: number; size: number; scale: number; shift: number };

/**
 * Swaps the words drawn in an inlined SVG's `<tspan>`s. Every word keeps the art's size: a longer one pushes the words
 * after it along its line and the art widens to hold it. English comes back byte for byte.
 */
export function svgFit(raw: string, swaps: readonly (readonly [english: string, shown: string])[]): string {
	if (swaps.every(([english, shown]) => english === shown)) return raw;
	const shift = num(/<g[^>]*transform="translate\((-?[\d.]+)/, raw) ?? 0;
	const words: Word[] = [];
	for (const text of raw.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
		const scale = num(/transform="matrix\(([\d.]+)/, text[1]) ?? 1;
		const e = num(/transform="matrix\((?:[-\d.]+,){4}(-?[\d.]+)/, text[1]) ?? 0;
		const base = text.index + text[0].indexOf(">") + 1;
		for (const span of text[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)) {
			const x = num(/\sx="(-?[\d.]+)"/, span[1]);
			const size = num(/font-size:([\d.]+)px/, span[1]) ?? num(/font-size:([\d.]+)px/, text[1]);
			if (x === null || size === null) continue;
			const start = base + span.index;
			words.push({ start, end: start + span[0].length, text: span[2], x, size, scale, shift: shift + e });
		}
	}
	const right = (w: Word, text: string, dx = 0) => w.shift + w.scale * (w.x + dx + ems(text) * w.size);
	const wasRight = Math.max(...words.map((w) => right(w, w.text)));

	const shown = new Map(words.map((w) => [w, w.text]));
	const moved = new Map(words.map((w) => [w, 0]));
	for (const [english, word] of swaps) {
		const w = words.find((v) => v.text === english);
		if (!w || word === english) continue;
		shown.set(w, word);
		const grow = (ems(word) - ems(english)) * w.size;
		for (const v of words) if (v.scale === w.scale && v.x > w.x) moved.set(v, (moved.get(v) ?? 0) + grow);
	}
	const isRight = Math.max(...words.map((w) => right(w, shown.get(w) ?? w.text, moved.get(w))));
	// A wider art gets a twentieth of an em more: its edge was trimmed to the English ink, and the table only estimates.
	const pad = isRight > wasRight ? Math.max(...words.map((w) => w.size * w.scale)) * 0.05 : 0;
	const grow = isRight - wasRight + pad;

	let out = "";
	let at = 0;
	for (const w of words) {
		const dx = moved.get(w) ?? 0;
		const tag = raw.slice(w.start, raw.indexOf(">", w.start) + 1);
		const placed = dx ? tag.replace(/(\s)x="(-?[\d.]+)"/, (_, s, x) => `${s}x="${(Number(x) + dx).toFixed(3)}"`) : tag;
		out += `${raw.slice(at, w.start)}${placed}${escapeXml(shown.get(w) ?? w.text)}</tspan>`;
		at = w.end;
	}
	out += raw.slice(at);
	return out.replace(/<svg\b[^>]*>/, (svg) => {
		const box = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
		if (!box) return svg;
		const wide = Number(box[3]) + grow;
		return svg
			.replace(box[0], `viewBox="${box[1]} ${box[2]} ${wide.toFixed(3)} ${box[4]}"`)
			.replace(/(\s)width="([\d.]+)"/, (_, s, px) => `${s}width="${((Number(px) * wide) / Number(box[3])).toFixed(3)}"`);
	});
}
