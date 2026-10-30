// `?raw` leaves an SVG's `<image href>` unresolved; this swaps in the URL Vite
// bundled for the photo. One glob per page, so a page ships only its own photos.

export function withLocalPhotos(
	svg: string,
	photos: Record<string, string>,
	folder: string,
): string {
	const ref = new RegExp(`href="[^"]*\\/pub-Rtvr\\/${folder}\\/([^"]+)"`, "g");
	return svg.replace(ref, (whole, file: string) => {
		const hit = Object.entries(photos).find(([path]) => path.endsWith(`/${file}`));
		return hit ? `href="${hit[1]}"` : whole;
	});
}
