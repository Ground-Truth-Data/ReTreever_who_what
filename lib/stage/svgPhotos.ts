// `?raw` leaves an SVG's `<image href>` unresolved; this swaps in the URL Vite
// bundled for the photo. One glob per page, so a page ships only its own photos.

export function withLocalPhotos(
	svg: string,
	photos: Record<string, string>,
	folder: string,
): string {
	return swapPhotos(svg, photos, folder, "");
}

/** The phone set: an SVG's `shard-N.webp` resolves to the glob's `shard-N-phone.webp`. */
export function withPhonePhotos(
	svg: string,
	photos: Record<string, string>,
	folder: string,
): string {
	return swapPhotos(svg, photos, folder, "-phone");
}

function swapPhotos(
	svg: string,
	photos: Record<string, string>,
	folder: string,
	suffix: string,
): string {
	const ref = new RegExp(`href="[^"]*\\/pub-Rtvr\\/${folder}\\/([^"]+)"`, "g");
	return svg.replace(ref, (whole, file: string) => {
		const want = `/${file.replace(/\.webp$/, `${suffix}.webp`)}`;
		const hit = Object.entries(photos).find(([path]) => path.endsWith(want));
		return hit ? `href="${hit[1]}"` : whole;
	});
}
