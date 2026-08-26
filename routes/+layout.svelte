<script lang="ts">
/**
 * THE RAPPER SHELL for this child — and it lives INSIDE the child it wraps.
 *
 * WHY IT IS HERE AND NOT IN RAPPER, WHICH IS WHERE IT BELONGS.
 * SvelteKit builds its layout tree from `kit.files.routes`, and there is no
 * separate option for a layout. rapper points that at this child's `routes/`,
 * so a +layout.svelte anywhere in rapper is simply never loaded — MEASURED
 * 25 Aug 2026: rapper served this child with no header, no bar and no <main>
 * at all, because the only route tree it can see is this folder.
 *
 * So the shell is RAPPER's in everything but LOCATION. When rapper leaves and
 * children are published to npm, this file is what an installer overwrites.
 *
 * This is not a site. It does not deploy, has no privacy page, no auth. It is
 * a bare SvelteKit project whose only job is to hold ONE child so it can be
 * run and debugged:
 *
 *   [logo]  OWNER — child   [view]      [gh] rapper  [gh] child   [pill]
 *
 * ONE CHILD, NOT A MENU. A rapper install contains exactly one child, chosen
 * at install time, so there is nothing to switch BETWEEN. The installer writes
 * CHILD below; a second child means a second install, in a second folder.
 *
 * WHY THIS FILE OWNS THE BRANDING AND DevBar DOES NOT. A child never knows
 * whose it is. CHILD is the only place that mapping lives, and it is handed to
 * DevBar as props — so the bar itself names no product and the same component
 * serves any owner.
 *
 * WHY THE ASSETS ARE IMPORTED, NOT REQUESTED. A `/mobileAssets/x.webp` URL is
 * resolved by the BROWSER against whichever server answered, so it finds a
 * file only under the parent whose static/ happens to hold one. Imported, the
 * bundler copies the bytes and they travel with the child — which is the whole
 * difference between a child that is portable and one that merely looks it.
 */
/**
 * THE MOUNTING PARENT'S TOKENS — via an alias, so no parent is named.
 *
 * Each parent fills `$hostStyles` with its own stylesheet: ReTreever points it
 * at src/app.css, rapper at src/app.tokens.css. So this one import gets
 * whichever tier actually mounted the child, and the child names neither. A
 * relative `../../rapper/src/...` would be a raw climb into a parent, which
 * noEscapePlugin throws on and noParentNames fails.
 *
 * WITHOUT IT, every var() the child paints fell back to its initial value: no
 * gold border on the search bar, no gold on the shard frames, and a serif
 * headline where --font-retreever should resolve.
 *
 * And it disabled the one thing built to answer "which tier is this?".
 * app.unique.css paints every white VIOLET in rapper's copy and leaves it
 * white in ReTreever's. The six `var(--rtvr-on-dark)` usages in this child
 * have NO fallback, so an undefined token inherited white — and the two tiers
 * became indistinguishable by eye, which is the exact illusion the two-server
 * split exists to kill.
 */
import "$hostStyles";
import { page } from "$app/state";
import DevBar from "$devPill/DevBar.svelte";
/**
 * THE BRAND MARKS COME FROM THE SHARED FOLDER, not a copy in this child.
 *
 * `$devPill` is filled by whichever tier mounted this child, and both fill it
 * with their own retreeved/sharedComponents/sharedMenu — which sits beside the
 * shared assets/. So one file per mark, replaced atomically from ReTreever on
 * every server start, instead of the same .webp drifting in three places.
 *
 * The child's own lib/assets/shell/ copies were byte-identical, which is
 * exactly how that kind of duplication hides: nothing looks wrong until one
 * side is updated and the others silently are not.
 */
import logoUrl from "$sharedAssets/ReTreever_logo_sm.webp";
import ghIconUrl from "$sharedAssets/github-logo.png";

const dev = import.meta.env.DEV;

/**
 * THE MOUNTED CHILD — written by the installer, one per rapper.
 *
 * `views` is a LIST because one child need not be one page. This one is: the
 * search page is the whole child, mounted at "/".
 */
const CHILD = {
	name: "who_what",
	owner: "ReTreever",
	repo: "ReTreever_who_what",
	views: [{ href: "/", label: "search" }],
};

/**
 * THE OTHER TIER — INJECTED BY RAPPER, not written here.
 *
 * These four constants are `define`d in rapper/vite.config.ts and substituted
 * at build time. They are NOT written literally anywhere in this folder, and
 * that is the whole point: a child has two possible parents and is published
 * on its own, so naming one is a fact about this machine that would ship
 * inside the open-source repo. `lib/noParentNames.test.ts` enforces it, and it
 * caught two attempts on 25 Aug 2026 — first the pill hardcoding the origin
 * "because it is only dev", then this file doing the same one layer up.
 *
 * The rule is not about leaking. It is that the knowledge belongs to whoever
 * MOUNTED this child, and the mounting tier is the only thing that knows it.
 * This file is rapper's shell, but it lives in the child's routes/ because
 * SvelteKit resolves layouts only from `kit.files.routes` — so "rapper's file"
 * is not somewhere a child-scanning guard can tell apart. The config can.
 *
 * A child cloned alone has no such config, so every one of these is undefined,
 * `otherHost` goes undefined, and the pill renders nothing at all — which is
 * the honest answer: there is no other parent to switch to.
 *
 * WHY import.meta.env AND NOT A BARE `define`d GLOBAL. Two failed shapes,
 * both MEASURED on 25 Aug 2026, worth writing down because each looks right:
 *
 *   `typeof __X__ === "string" ? __X__ : fallback`
 *     Vite's `define` is a literal text substitution and DELIBERATELY skips a
 *     `typeof X` expression, so the placeholder survives unreplaced and the
 *     value is never injected. The pill vanished from the SSR pass and only
 *     appeared after hydration.
 *
 *   a bare `__X__` with no guard
 *     Substitutes correctly under rapper, and throws ReferenceError in a child
 *     cloned alone — the exact checkout this child exists to support.
 *
 * `import.meta.env` is neither: it is always a real object, so an absent key
 * reads as `undefined` instead of throwing, and Vite still replaces the whole
 * member expression when the key IS defined. One shape that works in both
 * checkouts.
 */
const ENV = import.meta.env as Record<string, string | undefined>;

const THIS_TIER = ENV.VITE_RAPPER_TIER ?? "harness";
const OTHER_TIER = ENV.VITE_OTHER_TIER ?? "";
const OTHER_ORIGIN = ENV.VITE_OTHER_ORIGIN;
const MOUNT_THERE = ENV.VITE_OTHER_MOUNT ?? "/";
// Which half this tier occupies in the pill. Fixed per tier, so the control
// looks identical on both servers and only the highlight moves.
const THIS_SLOT = (ENV.VITE_TIER_SLOT ?? "right") as "left" | "right";

let { children } = $props();
</script>

<svelte:head>
	<!-- IDENTITY FOLLOWS THE CHILD. The harness is a surrogate parent: it has
	     no brand of its own, so the tab shows whichever product the mounted
	     child belongs to. -->
	<title>{`${CHILD.owner} — ${CHILD.name}`}</title>
	<link rel="icon" href={logoUrl} />
	{#if dev}
		<!-- How much room the bar takes off the top. A child that owns the
		     viewport starts below it; one that doesn't is unaffected. Declared
		     only while the bar exists, so production reserves nothing. -->
		<style>
			:root {
				/* Matches the real navbars: 64px bar plus the 3px gold rule. */
				--host-chrome: 67px;
			}
		</style>
	{/if}
</svelte:head>

<DevBar
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
	otherPath={MOUNT_THERE}
/>

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100dvh - var(--host-chrome, 0px));
	}
</style>
