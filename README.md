# ReTreever_who_what

The Who / What directory pages of ReTreever.

This is a **child**: a folder a host builds, never an app of its own. A host
mounts it by resolving the `$parent` alias to itself, so one import line lands
in whichever tier is running — and a child cloned alone defines no `$parent`,
so a stray import fails loudly at build instead of rendering half a page.

Serves `/who` and `/what` (one route, `routes/[tab=searchTab]/`, with the
matcher in `params/`). Mounted alone, `/` reroutes to `/who`.

## The host contract

Everything the host supplies arrives as **props**, typed in
[`lib/whoWhatTypes.ts`](./lib/whoWhatTypes.ts):

- `WhoWhatEndpoints` — the API surface. Absent → the fetch is skipped rather
  than aimed at a 404, and the list comes back empty.
- `WhoWhatRoutes` — the host's URL map. Absent → those links don't render.
- `WhoWhatFail` — the error thrower. Required, not optional, so a host that
  forgets to pass it fails to compile instead of crashing at runtime.

The page stands either way: with nothing wired in, the lists are empty, the
links are gone, and it still renders.

## Standing alone

This is the only child with **no `$parent/siblings` imports** — it needs no
sibling beside it, which makes it the cheapest to publish and the first place
to test any change to the publishing model.

It also imports **no framework package at all**. `@sveltejs/kit` was dropped on
26 Aug 2026: `resultLoad`'s `import { error }` was the last bare import of a
real package, and it broke both results pages the moment this folder became its
own repo — Node resolves a bare import from the importer, which is outside any
host's `node_modules`. That is `WhoWhatFail` now. `$app/*` stays, because those
are SvelteKit virtual modules supplied by the plugin, never resolved from disk.

[`deps.json`](./deps.json) is the entire allow-list, and `lib/` is the one door
to the host. Adding a line is a decision, not a formality.

## Public surface

[`index.ts`](./index.ts) — everything a host may import. Anything not exported
there is internal.

## Tests

```sh
npm test
```

Vitest, and it runs in a bare clone with no app around it. That is the point:
the guards that keep this child portable (`noParentNames`, `noHostPaths`,
`importCase`) are tests here rather than a build plugin, because a child ships
no `vite.config.ts` and so has no build to hook into. The parents enforce the
same rule as an unskippable Vite plugin.

## Licence

AGPL-3.0 — see [`LICENSE`](./LICENSE).
