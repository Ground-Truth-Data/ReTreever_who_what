<script lang="ts">
// THE RAPPER SHELL for this child — it lives inside the child because SvelteKit
// only builds layouts from kit.files.routes; a +layout.svelte placed in rapper
// itself is never loaded. MEASURED 25 Aug 2026: rapper served this child with
// no header, no bar and no <main> at all before this file moved here.
// ⚠️ Assets are imported, not fetched via string URL — a URL resolves against
// whichever server answered and may 404 outside its own parent's static/.
/**
 * THE MOUNTING PARENT'S TOKENS — via an alias, so no parent is named.
 *
 * ⚠️ Without this import every var() the child paints falls back to its
 * initial value (no gold border, serif headline) and the two tiers become
 * visually indistinguishable — the exact illusion the two-server split exists
 * to kill. A relative `../../rapper/src/...` climb is blocked by
 * noEscapePlugin/noParentNames.
 */
import "$parent/retreeved/app.css";
import { page } from "$app/state";
import SharedNav from "$parent/retreeved/sharedComponents/sharedNav/SharedNav.svelte";
import type { TierRoute } from "$parent/retreeved/sharedComponents/sharedNav/tierRoutes";
// Brand marks come from $parent/retreeved/sharedComponents, not a child-local
// copy — a local copy would silently drift the next time only one side updates.
import logoUrl from "$parent/retreeved/sharedAssets/ReTreever_logo_sm.webp";
import ghIconUrl from "$parent/retreeved/sharedAssets/github-logo.png";

const dev = import.meta.env.DEV;

// CHILD is written by the installer, one per rapper. views stays empty — a
// stale view list drifts from the routes it names, which is what happened to
// the old "search" button that pointed at a since-removed "/".
const CHILD = {
	name: "who_what",
	owner: "Get Cache",
	repo: "ReTreever_who_what",
	views: [],
};

// THE OTHER TIER — injected by rapper's vite.config.ts via `define`, never
// written literally here (a child is published standalone and must not ship
// a hardcoded parent name); lib/noParentNames.test.ts enforces it.
// import.meta.env, not a bare `define`d global: a typeof-guarded literal is
// skipped by Vite's define (MEASURED 25 Aug 2026 — the pill vanished under SSR
// and only appeared after hydration) and a bare literal throws in a child
// cloned alone. A solo clone gets undefined for all of these and the pill
// renders nothing, which is the honest answer.
const ENV = import.meta.env as Record<string, string | undefined>;

const THIS_TIER = ENV.VITE_RAPPER_TIER ?? "";
const OTHER_TIER = ENV.VITE_OTHER_TIER ?? "";
const OTHER_ORIGIN = ENV.VITE_OTHER_ORIGIN;
// Fallback destination when this page maps nowhere on the other tier;
// undefined in a solo clone, which degrades to "/".
const OTHER_HOME = ENV.VITE_OTHER_HOME;
// Injected as a JSON string, not an object — Vite's define substitutes text,
// and a solo clone gets undefined here and shows no pill.
// try/catch, not a bare parse: a malformed table is a config typo in a dev
// tool, and a dev tool must never be the thing that white-screens the app.
function readRoutes(raw: string | undefined): TierRoute[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
const TIER_ROUTES = readRoutes(ENV.VITE_TIER_ROUTES);
// Which half this tier occupies in the pill; fixed per tier so only the
// highlight moves.
const THIS_SLOT = (ENV.VITE_TIER_SLOT ?? "right") as "left" | "right";

let { children } = $props();
</script>

<svelte:head>
	<!-- Tab title follows the mounted child — rapper has no brand of its own. -->
	<title>{`${CHILD.owner} — ${CHILD.name}`}</title>
	<link rel="icon" href={logoUrl} />
	{#if dev}
		<!-- Height the bar takes off the top; declared only in dev, so
		     production reserves nothing. -->
		<style>
			:root {
				/* Matches the real navbars: 64px bar plus the 3px gold rule. */
				--host-chrome: 67px;
			}
		</style>
	{/if}
</svelte:head>

<SharedNav
	owner={CHILD.owner}
	name={CHILD.name}
	logo={logoUrl}
	repo={CHILD.repo}
	views={CHILD.views}
	ghIcon={ghIconUrl}
	pathname={page.url.pathname}
	tier={THIS_TIER}
	otherTier={OTHER_TIER}
	tierSlot={THIS_SLOT}
	otherHost={OTHER_ORIGIN}
	otherHome={OTHER_HOME}
	routes={TIER_ROUTES}
	selfRepo={THIS_TIER}
/>

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100dvh - var(--host-chrome, 0px));
	}
</style>
