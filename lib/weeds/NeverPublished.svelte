<script lang="ts">
// The fields no row of a table publishes, as empty slots: one dashed chip a
// field, under a short label, wrapping as the panel allows.
import { m } from "$parent/src/lib/paraglide/messages";

let { fields }: { fields: string[] } = $props();
const uid = $props.id();
</script>

<div class="never">
	<span class="label" id="{uid}-never">{m.ww_rating_weeds_never_published()}</span>
	<ul class="chips" aria-labelledby="{uid}-never">
		{#each fields as field (field)}
			<li>{field}</li>
		{/each}
	</ul>
</div>

<style>
	.never {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 10px;
		min-width: 0;
	}

	.label {
		font-family: var(--rt-font-web);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--rtvr-on-dark) 65%, transparent);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 0;
	}

	/* Dashed: a slot the platform left empty. */
	.chips li {
		max-width: 100%;
		padding: 3px 9px 4px;
		border: 1px dashed color-mix(in srgb, var(--color-gold-shard) 60%, transparent);
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-gold-shard) 7%, transparent);
		color: var(--rtvr-on-dark);
		font-family: var(--rt-font-web);
		font-size: 12px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}
</style>
