import type { Reroute } from "@sveltejs/kit";

/**
 * "/" RESOLVES TO THE DEFAULT VIEW — without becoming a second url for it.
 *
 * The child declares two views and serves each at its own path. That leaves
 * "/" with nothing of its own to be, and the two obvious answers are both
 * wrong:
 *
 *   - render the search page here too → one view, TWO urls. "Which url am I
 *     on" stops answering "which view am I looking at", which is precisely the
 *     ambiguity that left the Projects tab unlinkable and forced a
 *     `?rtvrFrom=` query stamp to carry which tab a tier-switch came from.
 *   - a redirect from a `+page.ts` load → tried first, and it 500s in this
 *     mount: SvelteKit resolves the child's routes through the parent's
 *     `kit.files.routes`, and a bare root load that only throws never produced
 *     a usable response here.
 *
 * `reroute` maps the url to a ROUTE without changing the address bar and
 * without a load running at all. "/" is answered by the /who route; /who stays
 * the only url that names that view. It is the same mechanism ReTreever's own
 * hooks.ts uses for getcache.org's root, for the same reason.
 *
 * A UNIVERSAL hook, so it applies to hard loads and client-side navigations
 * alike — otherwise the two disagree about what "/" means.
 */
export const reroute: Reroute = ({ url }) => {
	if (url.pathname === "/") return "/who";
};
