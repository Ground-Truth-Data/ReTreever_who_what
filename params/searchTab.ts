/**
 * Matches ONLY the two search-tab segments, so /who and /what share ONE
 * dynamic route and the search page survives a tab switch instead of
 * remounting and losing its lazily-fetched lists.
 *
 * WHY THIS EXISTS IN THE CHILD. This child used to serve a single page at "/",
 * which meant its two declared views had ONE url between them. Consequences,
 * all of them the same bug wearing different clothes:
 *
 *   - the Projects tab could never light up: it needs a /what to link to
 *   - switching tiers could not say WHICH tab you were on, so returning from
 *     the other tier always dropped you on /who
 *   - that was patched with a `?rtvrFrom=` query stamp — carrying in a query
 *     string a fact the path itself should have held
 *
 * The stamp is deleted along with the cause. A view the child declares is now
 * a url the child serves, so the URL is the state and there is nothing left to
 * carry alongside it.
 *
 * Typed as a guard so `params.tab` narrows to "who" | "what" in the route.
 */
export const match = (param: string): param is "who" | "what" =>
	param === "who" || param === "what";
