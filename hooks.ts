import type { Reroute } from "@sveltejs/kit";

// Unknown paths resolve to DEFAULT rather than 404ing — a solo install has no other tier to send a stray url to.
// ⚠️ Don't redirect via a root +page.ts here — it 500s in this mount; reroute only.
// Universal hook — reached only when a parent points kit.files.hooks.universal at this file; a standalone child never runs it.
// ⚠️ Keep in step with this child's defaultPath in retreeved/childRegistry.ts — nav and printed url read that record.
const SERVED = ["/who", "/what"];
const DEFAULT = "/who";

export const reroute: Reroute = ({ url }) => {
	// DEFAULT counts as served too — kept out of SERVED so SERVED means "the other views".
	const known = [DEFAULT, ...SERVED].some((p) => url.pathname === p);
	if (!known) return DEFAULT;
};
