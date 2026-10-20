<script lang="ts">
import ProjectsSelectedRaw from "./ratingAssets/Rating_page_projects_Selected.svg?raw";
import ProjectsUnselectedRaw from "./ratingAssets/Rating_page_projects_unselected.svg?raw";
import CropSelectedRaw from "./ratingAssets/Rating_page_crop_Selected.svg?raw";
import CropUnselectedRaw from "./ratingAssets/Rating_page_crop_unselected.svg?raw";
import PlantingSelectedRaw from "./ratingAssets/Rating_page_planting_Selected.svg?raw";
import PlantingUnselectedRaw from "./ratingAssets/Rating_page_planting_unselected.svg?raw";
import LandSelectedRaw from "./ratingAssets/Rating_page_land_Selected.svg?raw";
import LandUnselectedRaw from "./ratingAssets/Rating_page_land_unselected.svg?raw";
import PolymorphicSelectedRaw from "./ratingAssets/Rating_page_polymorphic_Selected.svg?raw";
import PolymorphicUnselectedRaw from "./ratingAssets/Rating_page_polymorphic_unselected.svg?raw";
import StakeholdersSelectedRaw from "./ratingAssets/Rating_page_stakeholders_Selected.svg?raw";
import StakeholdersUnselectedRaw from "./ratingAssets/Rating_page_stakeholders_unselected.svg?raw";
import SourcesSelectedRaw from "./ratingAssets/Rating_page_sources_Selected.svg?raw";
import SourcesUnselectedRaw from "./ratingAssets/Rating_page_sources_unselected.svg?raw";
import clumpsUrl from "./assets/pub-Rtvr/rating/weeds-clumps.webp";
import { WEEDS_TABLES, type WeedsTable } from "./whoWhatTypes";

let {
	active,
	onselect,
	panelId,
}: {
	active: WeedsTable;
	onselect: (table: WeedsTable) => void;
	panelId: string;
} = $props();

// Each sticker's viewBox width and the height of what it actually draws: the
// six new pairs carry a stray point below the box that pads the viewBox, so
// the strip sizes by width and clips at the drawn edge.
type Sticker = { lit: string; dim: string; vw: [number, number]; vh: [number, number] };
const STICKERS: Record<WeedsTable, { label: string } & Sticker> = {
	projects: { label: "Projects", lit: ProjectsSelectedRaw, dim: ProjectsUnselectedRaw, vw: [85.25, 71.9], vh: [49.7, 26.8] },
	crop: { label: "Crop", lit: CropSelectedRaw, dim: CropUnselectedRaw, vw: [102.3, 90.3], vh: [76, 52] },
	planting: { label: "Planting", lit: PlantingSelectedRaw, dim: PlantingUnselectedRaw, vw: [102.3, 90.3], vh: [78, 52] },
	land: { label: "Land", lit: LandSelectedRaw, dim: LandUnselectedRaw, vw: [102.3, 90.3], vh: [77, 52] },
	polymorphic: { label: "Polymorphic", lit: PolymorphicSelectedRaw, dim: PolymorphicUnselectedRaw, vw: [102.3, 90.3], vh: [78, 52] },
	stakeholders: { label: "Stakeholders", lit: StakeholdersSelectedRaw, dim: StakeholdersUnselectedRaw, vw: [102.3, 90.3], vh: [78, 52] },
	sources: { label: "Sources", lit: SourcesSelectedRaw, dim: SourcesUnselectedRaw, vw: [102.3, 90.3], vh: [79, 52] },
};

const tabId = (t: WeedsTable) => `weeds-tab-${t}`;

let stripEl = $state<HTMLElement | null>(null);

function move(from: WeedsTable, step: number) {
	const i = WEEDS_TABLES.indexOf(from);
	const next = WEEDS_TABLES[(i + step + WEEDS_TABLES.length) % WEEDS_TABLES.length];
	onselect(next);
	(stripEl?.querySelector(`#${tabId(next)}`) as HTMLElement | null)?.focus();
}

function keydown(e: KeyboardEvent, t: WeedsTable) {
	if (e.key === "ArrowRight") move(t, 1);
	else if (e.key === "ArrowLeft") move(t, -1);
	else if (e.key === "Home") {
		onselect(WEEDS_TABLES[0]);
		(stripEl?.querySelector(`#${tabId(WEEDS_TABLES[0])}`) as HTMLElement | null)?.focus();
	} else if (e.key === "End") {
		const last = WEEDS_TABLES[WEEDS_TABLES.length - 1];
		onselect(last);
		(stripEl?.querySelector(`#${tabId(last)}`) as HTMLElement | null)?.focus();
	} else return;
	e.preventDefault();
}

// On a phone the strip scrolls sideways; the lit tab comes into view.
$effect(() => {
	const el = stripEl?.querySelector(`#${tabId(active)}`) as HTMLElement | null;
	el?.scrollIntoView({ block: "nearest", inline: "nearest" });
});
</script>

<div class="strip-frame" style="--art-clumps: url({clumpsUrl});">
	<div class="clumps" aria-hidden="true">
		<span class="clump a"></span>
		<span class="clump b"></span>
		<span class="clump c"></span>
	</div>
	<div class="strip" role="tablist" aria-label="The weeds" bind:this={stripEl}>
		{#each WEEDS_TABLES as t (t)}
			{@const s = STICKERS[t]}
			{@const lit = t === active}
			<button
				type="button"
				role="tab"
				id={tabId(t)}
				class="tab"
				class:lit
				aria-selected={lit}
				aria-controls={panelId}
				tabindex={lit ? 0 : -1}
				style:--vw={lit ? s.vw[0] : s.vw[1]}
				style:--vh={lit ? s.vh[0] : s.vh[1]}
				onclick={() => onselect(t)}
				onkeydown={(e) => keydown(e, t)}
			>
				<span class="art" aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html lit ? s.lit : s.dim}
				</span>
				<span class="visually-hidden">{s.label}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.strip-frame {
		position: relative;
		width: 100%;
	}

	/* Three clumps peek over the strip's top edge, cropped from one sheet (1400×1049). */
	.clumps {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(100% - var(--tab-h) * 0.35);
		height: calc(var(--tab-h) * 1.6);
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	/* One sheet pixel is --tab-h / 150, so a 300px clump stands two tabs tall. */
	.clump {
		position: absolute;
		bottom: 0;
		background-image: var(--art-clumps, var(--rtvr-missing-art));
		background-repeat: no-repeat;
		background-size: calc(var(--tab-h) * 1400 / 150) auto;
		width: calc(var(--tab-h) * var(--cw) / 150);
		height: calc(var(--tab-h) * var(--ch) / 150);
		background-position: calc(var(--tab-h) * var(--cx) / -150) calc(var(--tab-h) * var(--cy) / -150);
	}

	.clump.a {
		--cx: 120;
		--cy: 320;
		--cw: 300;
		--ch: 315;
		left: 4%;
	}

	.clump.b {
		--cx: 690;
		--cy: 60;
		--cw: 440;
		--ch: 275;
		left: 42%;
	}

	.clump.c {
		--cx: 950;
		--cy: 305;
		--cw: 360;
		--ch: 330;
		right: 3%;
	}

	.strip {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: flex-end;
		gap: 2px;
		padding: 0 4px;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	.tab {
		flex: none;
		display: block;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		/* The drawn box's height is the strip's unit; the width follows each sticker's own aspect. */
		height: var(--tab-h);
		width: calc(var(--tab-h) * var(--vw) / var(--vh));
		overflow: hidden;
		border-radius: 2px;
	}

	.tab.lit {
		height: calc(var(--tab-h) * 1.5);
		width: calc(var(--tab-h) * 1.5 * var(--vw) / var(--vh));
	}

	.art {
		display: block;
		width: 100%;
	}

	.art :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(1px 2px 4px rgb(12 8 1 / 0.45));
	}

	.tab.lit .art :global(svg) {
		filter:
			drop-shadow(0 0 2px var(--color-gold-shard))
			drop-shadow(0 0 10px rgb(240 182 10 / 0.55));
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 2px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
