<script lang="ts">
import { cn } from "./cn";

// foreignObject boxes are in SVG user units: font-size inside one scales with the artwork, not px.

let {
	value = $bindable(""),
	dropdownOpen = $bindable(false),
	placeholder = "Search…",
	ariaLabel = "Search",
	id = "home-search",
	class: className = "",
	onsearch,
	onactivate,
	onkeynav,
	activeDescendant = undefined,
	listId = undefined,
}: {
	value?: string;
	dropdownOpen?: boolean;
	placeholder?: string;
	ariaLabel?: string;
	id?: string;
	class?: string;
	onsearch?: (query: string) => void;
	/** First intent to search; the route lazy-loads the rows on it. */
	onactivate?: () => void;
	/** Arrow keys walk the dropdown while focus stays in the field. */
	onkeynav?: (dir: 1 | -1) => void;
	activeDescendant?: string;
	listId?: string;
} = $props();

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "ArrowDown" || e.key === "ArrowUp") {
		e.preventDefault();
		if (!dropdownOpen) {
			dropdownOpen = true;
			onactivate?.();
		}
		onkeynav?.(e.key === "ArrowDown" ? 1 : -1);
	}
}

let inputEl = $state<HTMLInputElement | null>(null);

function clear() {
	value = "";
	dropdownOpen = true;
	onactivate?.();
	inputEl?.focus();
}

function handleSubmit(event: SubmitEvent) {
	event.preventDefault();
	onsearch?.(value);
}
</script>

<!-- form= wires the foreignObject controls explicitly; DOM ancestry doesn't cross the SVG boundary. -->
<form
	{id}
	class={cn("search-bar", className)}
	role="search"
	onsubmit={handleSubmit}
	onpointerenter={() => onactivate?.()}
>
	<svg
		class="search-bar-svg"
		viewBox="0 0 284.70643 49.229731"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g
			transform="matrix(1.051742,0,0,1.051742,-377.28326,-728.02404)"
			aria-hidden="true"
		>
			<path
				d="m 366.00274,695.09496 188.98809,-0.30013 1.25992,39.6875 -195.28769,2.51984 z"
				fill="#000000"
				stroke="currentColor"
				stroke-width="3.96875"
			/>
			<path
				class="submit-panel"
				d="m 553.99891,694.80111 62.77816,-0.62848 10.14092,39.90808 -71.7001,0.314 z"
				fill="#171d31"
				stroke="currentColor"
				stroke-width="3.89914"
			/>
			<path
				class="glyph glyph-conifer"
				d="m 601.15926,701.13475 -6.74173,10.91518 5.13655,-2.88931 -6.74173,8.50742 5.13656,-3.21035 -6.09966,8.34691 8.02586,-4.81552 -0.64206,8.98898 h 3.53138 v -7.70485 l 5.77863,3.21035 -3.85242,-8.3469 4.81552,1.92621 -5.77863,-6.74173 5.4576,1.60517 z"
				fill="var(--rtvr-on-dark)"
			/>
			<path
				class="glyph glyph-magnifier"
				d="m 581.88475,700.49754 c -2.72423,-0.0819 -5.33111,1.26812 -7.06397,4.09602 -4.14618,6.76624 1.40955,10.67195 0.8297,11.45174 l -6.97062,9.46013 2.48951,2.82151 7.46852,-10.29003 c 0,0 6.3265,3.10153 10.29004,-1.65961 3.77015,-4.52883 2.55525,-9.95714 -0.8299,-13.11135 -1.90466,-1.77471 -4.09442,-2.70472 -6.21328,-2.76841 z m 0.6535,3.76422 a 6.3897379,5.476919 0 0 1 6.38968,5.47691 6.3897379,5.476919 0 0 1 -6.38968,5.47692 6.3897379,5.476919 0 0 1 -6.38986,-5.47692 6.3897379,5.476919 0 0 1 6.38986,-5.47691 z"
				fill="var(--rtvr-on-dark)"
			/>
			<path
				class="glyph caret"
				class:caret-open={dropdownOpen}
				d="m 374.23363,707.44914 7.0626,19.92288 4.57452,-19.92288 z"
				fill="var(--rtvr-on-dark)"
			/>
			<path
				d="m 395.88813,697.06297 -3.23154,37.52044"
				fill="none"
				stroke="currentColor"
				stroke-width="2.93183"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</g>

		<foreignObject x="6" y="5" width="34" height="39">
			<button
				xmlns="http://www.w3.org/1999/xhtml"
				type="button"
				class="hit hit-list"
				form={id}
				aria-expanded={dropdownOpen}
				aria-label="Search by list"
				onclick={() => {
					dropdownOpen = !dropdownOpen;
					if (dropdownOpen) onactivate?.();
				}}
			></button>
		</foreignObject>

		<foreignObject x="44" y="8" width="157" height="32">
			<div xmlns="http://www.w3.org/1999/xhtml" class="input-shell">
				<input
					type="search"
					form={id}
					class="search-input"
					{placeholder}
					aria-label={ariaLabel}
					role="combobox"
					aria-expanded={dropdownOpen}
					aria-controls={listId}
					aria-activedescendant={activeDescendant}
					aria-autocomplete="list"
					onfocus={() => {
						dropdownOpen = true;
						onactivate?.();
					}}
					onkeydown={handleKeydown}
					oninput={(e) => {
						// The DOM, not `value`: must not depend on bind ordering.
						if (e.currentTarget.value.trim().length > 0) {
							dropdownOpen = true;
						}
					}}
					bind:value
					bind:this={inputEl}
				/>
				{#if value}
					<button
						type="button"
						class="clear"
						form={id}
						aria-label="Clear search"
						onclick={clear}
					>
						<svg viewBox="0 0 10 10" aria-hidden="true">
							<path d="M2 2 8 8M8 2 2 8" />
						</svg>
					</button>
				{/if}
			</div>
		</foreignObject>

		<foreignObject x="207" y="4" width="68" height="38">
			<button
				xmlns="http://www.w3.org/1999/xhtml"
				type="submit"
				form={id}
				class="hit hit-search"
				aria-label={ariaLabel}
			></button>
		</foreignObject>
	</svg>
</form>

<style>
	.search-bar {
		display: block;
		width: 100%;
	}

	/* Every stroke is currentColor; this one line recolours the bar. */
	.search-bar-svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
		color: var(--color-gold-bar);
	}

	/* Hover scale stays small: past ~1.08 the bar collides with the tabs above. */
	.glyph {
		transform-box: fill-box;
		transform-origin: center;
		transition:
			transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
			fill 0.18s ease;
	}

	/* The hit buttons are transparent; :has() lets their hover drive the visible glyph. */
	.search-bar-svg:has(.hit-search:hover) .glyph-magnifier,
	.search-bar-svg:has(.hit-search:focus-visible) .glyph-magnifier,
	.search-bar-svg:has(.hit-search:hover) .glyph-conifer,
	.search-bar-svg:has(.hit-search:focus-visible) .glyph-conifer {
		transform: scale(1.16) rotate(-4deg);
		fill: var(--color-gold-shard);
	}

	.search-bar-svg:has(.hit-list:hover) .caret,
	.search-bar-svg:has(.hit-list:focus-visible) .caret {
		transform: scale(1.28) rotate(6deg);
		fill: var(--color-gold-shard);
	}

	.search-bar-svg:has(.hit-search:hover) .submit-panel {
		fill: #23304f;
		transition: fill 0.18s ease;
	}

	/* rotate + transform compose; transition must name all three or this overrides .glyph's. */
	.caret {
		transform-box: fill-box;
		transform-origin: center;
		transition:
			rotate 0.2s ease,
			transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
			fill 0.18s ease;
	}

	.caret-open {
		rotate: 180deg;
	}

	.input-shell {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
	}

	.search-input {
		width: 100%;
		height: 100%;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		padding: 0;
		margin: 0;
		color: var(--rtvr-on-dark);
		font-family: inherit;
		font-size: 15px;
		line-height: 1.1;
		caret-color: var(--color-gold-bar);
		-webkit-appearance: none;
		appearance: none;
	}

	.search-input::placeholder {
		color: #8d93a6;
	}

	/* Safari's own clear button lands outside the panel at these scales; .clear is ours. */
	.search-input::-webkit-search-decoration,
	.search-input::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}

	.clear {
		flex: none;
		width: 20px;
		height: 100%;
		padding: 0;
		display: grid;
		place-items: center;
		background: none;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		color: #8d93a6;
		transition: color 0.18s ease;
	}

	.clear svg {
		width: 9px;
		height: 9px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.clear:hover,
	.clear:focus-visible {
		color: var(--color-gold-shard);
	}

	.hit {
		width: 100%;
		height: 100%;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	/* Faint on purpose: the glyph transform is the visible hover. */
	.hit:hover {
		background: rgb(245 161 25 / 0.2);
	}

	.hit:focus-visible,
	.clear:focus-visible,
	.search-input:focus-visible {
		outline: 2px solid var(--color-gold-bar);
		outline-offset: 1px;
	}
</style>
