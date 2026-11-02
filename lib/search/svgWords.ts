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

/** Squeezes a translated word whose real width overruns its art's box; the budgets are in each tspan's own units. */
export function fitWords(node: HTMLElement, budgets: Record<string, number>) {
	const fit = () => {
		for (const [id, max] of Object.entries(budgets)) {
			const word = node.querySelector<SVGTextContentElement>(`#${id}`);
			if (!word) continue;
			word.removeAttribute("textLength");
			word.removeAttribute("lengthAdjust");
			if (word.getComputedTextLength() <= max) continue;
			word.setAttribute("textLength", String(max));
			word.setAttribute("lengthAdjust", "spacingAndGlyphs");
		}
	};
	fit();
	void document.fonts?.ready.then(fit);
}
