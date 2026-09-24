import type { Reroute } from "@sveltejs/kit";

// Unknown paths reroute to DEFAULT; a root +page.ts redirect 500s in this mount.
// Keep in step with this child's defaultPath in $rig/childRegistry.ts.
const SERVED = ["/who", "/what"];
const DEFAULT = "/who";

export const reroute: Reroute = ({ url }) => {
	const known = [DEFAULT, ...SERVED].some((p) => url.pathname === p);
	if (!known) return DEFAULT;
};
