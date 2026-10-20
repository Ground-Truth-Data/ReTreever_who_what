<script lang="ts">
import { formatCell } from "./weedsFormat";
import type { WeedsColumn, WeedsRow } from "./whoWhatTypes";

let {
	columns,
	rows,
	open = undefined,
}: {
	columns: WeedsColumn[];
	rows: WeedsRow[];
	/** The column whose cell opens the row, and what opening does. */
	open?: { column: string; on: (row: WeedsRow) => void };
} = $props();
</script>

<div class="weeds-table-wrap">
	<table class="weeds-table">
		<thead>
			<tr>
				{#each columns as c (c.key)}
					<th scope="col" class={c.kind}>{c.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (i)}
				<tr>
					{#each columns as c (c.key)}
						{@const v = row[c.key]}
						{@const shown = formatCell(v, c.kind)}
						<td class={c.kind}>
							{#if c.kind === "link" && v}
								<a href={String(v)} rel="noopener" target="_blank">{shown}</a>
							{:else if open && c.key === open.column && v}
								<button type="button" class="row-open" onclick={() => open.on(row)}>{shown}</button>
							{:else}
								{shown}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* The wrapper scrolls, never the page: seven columns at 390px stay inside it. */
	.weeds-table-wrap {
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		border: 3px solid var(--color-gold-bar);
		border-radius: 2px;
		background: #000;
	}

	.weeds-table {
		border-collapse: collapse;
		min-width: 100%;
		font-family: var(--rt-font-web);
		font-size: 14px;
		line-height: 1.3;
		color: var(--rtvr-on-dark);
	}

	th,
	td {
		padding: 10px 12px;
		border: 1px solid #2e3342;
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
		max-width: 28rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	th {
		position: sticky;
		top: 0;
		background: #000;
		color: var(--color-gold-bar);
		font-weight: 500;
		font-size: 13px;
		letter-spacing: 0.02em;
	}

	th.number,
	td.number,
	th.score,
	td.score {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	td.date {
		font-variant-numeric: tabular-nums;
	}

	tbody tr:hover {
		background: rgb(250 215 2 / 0.08);
	}

	a,
	.row-open {
		color: var(--color-gold-shard);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.row-open {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		font: inherit;
		cursor: pointer;
	}

	a:hover,
	a:focus-visible,
	.row-open:hover,
	.row-open:focus-visible {
		color: var(--color-gold-bar);
		outline: none;
	}

	.row-open:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 1px;
	}
</style>
