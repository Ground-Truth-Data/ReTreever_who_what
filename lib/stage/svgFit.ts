const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Futura Medium's advance widths in hundredths of an em, a–z then A–Z; an accented letter takes its base
// letter's. The stickers clip at their viewBox, so a wider translation is squeezed to the English word's width.
const LOWER = "60 60 48 60 55 30 60 55 25 25 50 25 79 55 60 60 60 37 41 27 54 50 77 56 54 54".split(" ").map(Number);
const UPPER = "74 59 70 73 57 51 84 73 29 41 66 44 96 84 89 54 89 60 58 48 74 68 106 62 60 63".split(" ").map(Number);
const advance = (ch: string) => {
	const c = ch.normalize("NFD").charCodeAt(0);
	if (c >= 97 && c <= 122) return LOWER[c - 97] / 100;
	if (c >= 65 && c <= 90) return UPPER[c - 65] / 100;
	return ch === "-" ? 0.22 : 0.31;
};
const ems = (s: string) => [...s].reduce((w, ch) => w + advance(ch), 0);
const fontSize = (tag: string) => {
	const hit = /font-size:([\d.]+)px/.exec(tag);
	return hit ? Number(hit[1]) : null;
};

/** Swaps the words drawn in an inlined SVG's `<tspan>`s; English comes back byte for byte, a wider word is squeezed to fit. */
export function svgFit(raw: string, swaps: readonly (readonly [english: string, shown: string])[]): string {
	let out = raw;
	for (const [english, shown] of swaps) {
		if (shown === english) continue;
		const close = `>${english}</tspan>`;
		const at = out.indexOf(close);
		if (at === -1) continue;
		const open = out.lastIndexOf("<tspan", at);
		let tag = out.slice(open, at);
		if (ems(shown) > ems(english)) {
			const size = fontSize(tag) ?? fontSize(out.slice(out.lastIndexOf("<text", open), open));
			if (size) tag += ` textLength="${(ems(english) * size).toFixed(2)}" lengthAdjust="spacingAndGlyphs"`;
		}
		out = `${out.slice(0, open)}${tag}>${escapeXml(shown)}</tspan>${out.slice(at + close.length)}`;
	}
	return out;
}
