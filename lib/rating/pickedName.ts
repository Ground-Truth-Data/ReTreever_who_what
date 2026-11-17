// The host remounts the rating page on every navigation, so a picked name does
// not reach the page it opens: whoever navigates leaves the name here first.
// Its own module, so the search page can leave a name without loading the rating page.
let picked: { href: string; name: string } | null = null;

/** Call before navigating to a rating page; a missing href or name clears the last pick. */
export function holdPickedName(href: string | undefined, name: string | null | undefined) {
	picked = href && name ? { href, name } : null;
}

/** The picked name when the pick opened this page, else "". */
export function pickedNameFor(page: { href: string; pathname: string }): string {
	return picked && new URL(picked.href, page.href).pathname === page.pathname ? picked.name : "";
}
