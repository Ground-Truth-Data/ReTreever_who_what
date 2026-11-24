import { defineParams } from "@sveltejs/kit/params";

// /who and /what share one route so a tab switch doesn't remount and lose the lazily-fetched lists.
export const params = defineParams({
	searchTab: (param) => (param === "who" || param === "what" ? param : undefined),
});
