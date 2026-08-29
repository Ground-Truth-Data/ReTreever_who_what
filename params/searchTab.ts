// Matches only "who"/"what" — /who and /what share one dynamic route so tab switches don't remount and lose lazily-fetched lists
// Typed as a guard so params.tab narrows to "who" | "what" in the route
export const match = (param: string): param is "who" | "what" =>
	param === "who" || param === "what";
