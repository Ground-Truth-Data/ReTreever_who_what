import { describe, expect, it } from "vitest";
import { safeHref } from "./safeHref";

describe("safeHref", () => {
	it("keeps an http or https URL as given", () => {
		expect(safeHref("https://explorer.land/x/project/abc")).toBe("https://explorer.land/x/project/abc");
		expect(safeHref("http://example.org")).toBe("http://example.org");
		expect(safeHref("HTTPS://Example.org/Path")).toBe("HTTPS://Example.org/Path");
	});

	it("refuses a script or data URL, however it is cased or padded", () => {
		expect(safeHref("javascript:alert(1)")).toBeNull();
		expect(safeHref("JavaScript:alert(1)")).toBeNull();
		expect(safeHref(" javascript:alert(1)")).toBeNull();
		expect(safeHref("java\tscript:alert(1)")).toBeNull();
		expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
		expect(safeHref("vbscript:msgbox(1)")).toBeNull();
	});

	it("refuses a relative or malformed URL", () => {
		expect(safeHref("/who/acme")).toBeNull();
		expect(safeHref("//evil.example/x")).toBeNull();
		expect(safeHref("example.org/page")).toBeNull();
		expect(safeHref("http//missing-colon")).toBeNull();
		expect(safeHref("https://")).toBeNull();
		expect(safeHref("")).toBeNull();
	});

	it("refuses a value that is not a string", () => {
		expect(safeHref(42)).toBeNull();
		expect(safeHref(null)).toBeNull();
		expect(safeHref(undefined)).toBeNull();
	});
});
