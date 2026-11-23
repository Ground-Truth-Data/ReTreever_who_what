import { describe, expect, it } from "vitest";
import { svgFit } from "./svgFit";

const art = `<svg
   width="200"
   viewBox="0 0 100 50"><g transform="translate(-10,0)"><text style="font-size:40px"><tspan style="fill:red" x="10" y="40">Dig</tspan></text><text style="font-size:40px"><tspan
   x="90" y="40">.</tspan></text></g></svg>`;
const attr = (out: string, re: RegExp) => Number(re.exec(out)?.[1]);

describe("svgFit", () => {
	it("gives English back byte for byte", () => {
		expect(svgFit(art, [["Dig", "Dig"]])).toBe(art);
	});

	it("keeps a wider word at the art's size, never squeezed", () => {
		const out = svgFit(art, [["Dig", "Creusez"]]);
		expect(out).not.toMatch(/textLength|lengthAdjust/);
		expect(out).toContain(`<tspan style="fill:red" x="10" y="40">Creusez</tspan>`);
	});

	it("pushes the words after it along the line", () => {
		expect(attr(svgFit(art, [["Dig", "Creusez"]]), /x="([\d.]+)" y="40">\./)).toBeGreaterThan(90);
	});

	it("widens the art by as much, keeping its height", () => {
		const out = svgFit(art, [["Dig", "Creusez"]]);
		const wide = attr(out, /viewBox="0 0 ([\d.]+) 50"/);
		expect(wide).toBeGreaterThan(150);
		expect(attr(out, /width="([\d.]+)"/)).toBeCloseTo(wide * 2, 1);
	});

	it("closes up behind a narrower word", () => {
		const out = svgFit(art, [["Dig", "In"]]);
		expect(attr(out, /x="([\d.]+)" y="40">\./)).toBeLessThan(90);
		expect(attr(out, /viewBox="0 0 ([\d.]+) 50"/)).toBeLessThan(100);
	});
});
