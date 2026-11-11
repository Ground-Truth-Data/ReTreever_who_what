/** The URL when a scraped value may be a link (http or https only), else null: a platform's `javascript:` or `data:` URL stays text. */
export function safeHref(value: unknown): string | null {
	if (typeof value !== "string") return null;
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:" ? value : null;
	} catch {
		return null;
	}
}
