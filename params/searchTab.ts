// /who and /what share one route so a tab switch doesn't remount and lose the lazily-fetched lists.
export const match = (param: string): param is "who" | "what" =>
	param === "who" || param === "what";
