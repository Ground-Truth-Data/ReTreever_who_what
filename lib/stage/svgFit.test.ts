import { describe, expect, it } from "vitest";
import { svgFit } from "./svgFit";

const art = `<text style="font-size:40px"><tspan style="fill:red" x="100" y="200">Dig</tspan></text>`;

describe("svgFit", () => {
	it("gives English back byte for byte", () => {
		expect(svgFit(art, [["Dig", "Dig"]])).toBe(art);
	});

	it("keeps a narrower word at the art's size", () => {
		expect(svgFit(art, [["Dig", "In"]])).toBe(art.replace(">Dig<", ">In<"));
	});

	it("scales a wider word down evenly, never squeezing its letters", () => {
		const out = svgFit(art, [["Dig", "Creusez"]]);
		expect(out).not.toMatch(/textLength|lengthAdjust/);
		const size = Number(/font-size:([\d.]+)px;?[^"]*"[^>]*>Creusez/.exec(out)?.[1]);
		expect(size).toBeGreaterThan(10);
		expect(size).toBeLessThan(40);
	});

	it("lifts the smaller word so it stays centred on the art's line", () => {
		const out = svgFit(art, [["Dig", "Creusez"]]);
		expect(Number(/y="([\d.]+)"[^>]*>Creusez/.exec(out)?.[1])).toBeLessThan(200);
		expect(/x="([\d.]+)"[^>]*>Creusez/.exec(out)?.[1]).toBe("100");
	});
});
