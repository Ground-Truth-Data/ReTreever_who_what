import { describe, expect, it } from "vitest";
import { holdPickedName, pickedNameFor } from "./pickedName";

const page = (pathname: string) => ({ href: `http://retreever.localhost${pathname}`, pathname });

describe("pickedName", () => {
	it("gives the name to the page the pick opened", () => {
		holdPickedName("/what/a-1", "A long project name");
		expect(pickedNameFor(page("/what/a-1"))).toBe("A long project name");
	});

	it("gives nothing to any other page", () => {
		holdPickedName("/what/a-1", "A long project name");
		expect(pickedNameFor(page("/what/a-2"))).toBe("");
		expect(pickedNameFor(page("/who/a-1"))).toBe("");
	});

	it("matches on the path, whatever the href's query", () => {
		holdPickedName("/fr/what/a-1?from=search", "Nom");
		expect(pickedNameFor(page("/fr/what/a-1"))).toBe("Nom");
	});

	it("a pick with no href or no name clears the last one", () => {
		holdPickedName("/what/a-1", "Name");
		holdPickedName(undefined, "Other");
		expect(pickedNameFor(page("/what/a-1"))).toBe("");
		holdPickedName("/what/a-1", "Name");
		holdPickedName("/what/a-1", undefined);
		expect(pickedNameFor(page("/what/a-1"))).toBe("");
	});
});
