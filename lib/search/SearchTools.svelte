<script module lang="ts">
import { m } from "$parent/src/lib/paraglide/messages";
import type { SearchOrder } from "./searchLists";

/** The panel's choice for the visit, shared by every search bar on the site. */
export const searchOrder = $state<{ by: SearchOrder }>({ by: "size" });

export function orderLabel(order: SearchOrder): string {
	if (order === "rating") return m.ww_search_list_best_rated();
	if (order === "name") return m.ww_search_list_a_z();
	return m.ww_search_list_biggest();
}
</script>

<script lang="ts">
import { SEARCH_ORDERS } from "./searchLists";

let { id }: { id: string } = $props();

let open = $state(false);
let wrapEl = $state<HTMLElement | null>(null);
let buttonEl = $state<HTMLButtonElement | null>(null);

function choose(order: SearchOrder) {
	searchOrder.by = order;
	open = false;
	buttonEl?.focus();
}

function closeOnOutside(e: PointerEvent) {
	if (open && wrapEl && !wrapEl.contains(e.target as Node)) open = false;
}

// Escape shuts the panel alone; the list under the bar stays open.
function closeOnEscape(e: KeyboardEvent) {
	if (!open || e.key !== "Escape") return;
	e.stopPropagation();
	e.preventDefault();
	open = false;
	buttonEl?.focus();
}
</script>

<svelte:window onpointerdown={closeOnOutside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="search-tools" bind:this={wrapEl} onkeydown={closeOnEscape}>
	<button
		bind:this={buttonEl}
		type="button"
		class="tools-button"
		aria-expanded={open}
		aria-controls={id}
		aria-label={m.ww_search_tools_button({ order: orderLabel(searchOrder.by) })}
		onclick={() => (open = !open)}
	>
		<span class="tools-current" aria-hidden="true">{orderLabel(searchOrder.by)}</span>
		<svg class="tools-icon" viewBox="0 0 16 16" aria-hidden="true">
			<path d="M2 4h12M2 8h12M2 12h12" />
			<circle cx="5" cy="4" r="1.6" />
			<circle cx="11" cy="8" r="1.6" />
			<circle cx="7" cy="12" r="1.6" />
		</svg>
	</button>
	{#if open}
		<fieldset class="tools-panel" {id}>
			<legend class="tools-legend">{m.ww_search_tools_legend()}</legend>
			{#each SEARCH_ORDERS as order (order)}
				<label class="tools-option" class:chosen={searchOrder.by === order}>
					<input type="radio" name={id} value={order} checked={searchOrder.by === order} onchange={() => choose(order)} />
					{orderLabel(order)}
				</label>
			{/each}
		</fieldset>
	{/if}
</div>

<style>
	.search-tools {
		position: relative;
		display: flex;
		justify-content: flex-end;
	}

	.tools-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 6px;
		background: none;
		border: none;
		border-radius: 2px;
		color: var(--rt-yellow);
		font-family: var(--rt-font-web);
		font-size: max(10px, calc(7 * var(--u, 1px)));
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.tools-button:hover,
	.tools-button:focus-visible,
	.tools-button[aria-expanded="true"] {
		background: color-mix(in srgb, var(--rt-yellow) 14%, transparent);
	}

	.tools-icon {
		width: 14px;
		height: 14px;
		fill: var(--rt-bg);
		stroke: currentColor;
		stroke-width: 1.4;
	}

	.tools-panel {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 10rem;
		margin: 0;
		padding: 6px;
		background: var(--rt-bg);
		border: 1px solid var(--rt-border-white-glow);
		border-radius: 4px;
	}

	.tools-legend {
		float: left;
		width: 100%;
		padding: 2px 6px 4px;
		color: var(--rt-yellow);
		font-family: var(--rt-font-web);
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.tools-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px;
		border-radius: 2px;
		color: var(--rtvr-on-dark);
		font-size: 13px;
		cursor: pointer;
	}
	.tools-option:hover,
	.tools-option:focus-within,
	.tools-option.chosen {
		background: color-mix(in srgb, var(--rt-yellow) 14%, transparent);
	}
	.tools-option input {
		accent-color: var(--rt-yellow);
		margin: 0;
	}

	@media (max-width: 767px) {
		.tools-button,
		.tools-option {
			min-height: 44px;
		}
	}
</style>
