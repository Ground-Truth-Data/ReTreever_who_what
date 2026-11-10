const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Swaps the words drawn in an inlined SVG's `<tspan>`s; English comes back byte for byte. */
export function svgWords(raw: string, swaps: readonly (readonly [english: string, shown: string])[]): string {
	let out = raw;
	for (const [english, shown] of swaps) {
		if (shown === english) continue;
		out = out.replace(`>${english}</tspan>`, `>${escapeXml(shown)}</tspan>`);
	}
	return out;
}

