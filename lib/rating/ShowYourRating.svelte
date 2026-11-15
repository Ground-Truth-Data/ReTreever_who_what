<script lang="ts" module>
export type BadgeSize = "small" | "large";
export type BadgeTheme = "light" | "dark";

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The HTML an org pastes: a plain link around a plain image, never a script. */
export function badgeSnippet(ratingUrl: string, imageUrl: string, box: { width: number; height: number }, alt: string): string {
	return `<a href="${attr(ratingUrl)}"><img src="${attr(imageUrl)}" width="${box.width}" height="${box.height}" alt="${attr(alt)}"></a>`;
}
</script>

<script lang="ts">
// The "show your rating" page: the org's badge in each size and background,
// and the HTML to put it on the org's own site.
import { m } from "$parent/src/lib/paraglide/messages";

let {
	name,
	rating,
	ratingUrl,
	backHref,
	badgeUrl,
	boxes,
	alt,
}: {
	name: string;
	rating: number | null;
	/** The rating page, absolute: the badge's link. */
	ratingUrl: string;
	/** The rating page, as this site links it. */
	backHref: string;
	/** The badge image, absolute, as the host serves it. */
	badgeUrl: (size: BadgeSize, theme: BadgeTheme) => string;
	/** Each size's box in CSS pixels. */
	boxes: Record<BadgeSize, { width: number; height: number }>;
	alt: string;
} = $props();

let size = $state<BadgeSize>("large");
let theme = $state<BadgeTheme>("light");
let copied = $state(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const src = $derived(badgeUrl(size, theme));
const snippet = $derived(badgeSnippet(ratingUrl, src, boxes[size], alt));

const SIZES: { value: BadgeSize; label: () => string }[] = [
	{ value: "large", label: m.ww_rating_badge_large },
	{ value: "small", label: m.ww_rating_badge_small },
];
const THEMES: { value: BadgeTheme; label: () => string }[] = [
	{ value: "light", label: m.ww_rating_badge_light },
	{ value: "dark", label: m.ww_rating_badge_dark },
];

async function copy() {
	try {
		await navigator.clipboard.writeText(snippet);
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2400);
	} catch (e) {
		console.error("[badge] copy refused", e);
	}
}

$effect(() => () => clearTimeout(copyTimer));
</script>

<section class="show">
	<header class="head">
		<h1 class="title">{m.ww_rating_badge_heading()}</h1>
		<p class="name">{name}</p>
	</header>

	<p class="lead">{m.ww_rating_badge_intro()}</p>
	{#if rating === null}
		<p class="lead">{m.ww_rating_badge_unscored({ name })}</p>
	{/if}

	<div class="choices">
		<fieldset class="choice">
			<legend>{m.ww_rating_badge_size()}</legend>
			<div class="pills">
				{#each SIZES as s (s.value)}
					<label class="pill" class:on={size === s.value}>
						<input type="radio" name="badge-size" value={s.value} bind:group={size} />
						{s.label()}
					</label>
				{/each}
			</div>
		</fieldset>
		<fieldset class="choice">
			<legend>{m.ww_rating_badge_theme()}</legend>
			<div class="pills">
				{#each THEMES as t (t.value)}
					<label class="pill" class:on={theme === t.value}>
						<input type="radio" name="badge-theme" value={t.value} bind:group={theme} />
						{t.label()}
					</label>
				{/each}
			</div>
		</fieldset>
	</div>

	<div class="preview" class:dark={theme === "dark"}>
		<!-- Keyed, so a choice never shows the last badge at the new size while the new one loads. -->
		{#key src}
			<a href={backHref}><img {src} width={boxes[size].width} height={boxes[size].height} {alt} /></a>
		{/key}
	</div>

	<div class="code-head">
		<span class="code-label" id="badge-code-label">{m.ww_rating_badge_code_label()}</span>
		<button type="button" class="copy" onclick={copy}>{copied ? m.ww_rating_badge_copied() : m.ww_rating_badge_copy()}</button>
		<span class="spoken" role="status">{copied ? m.ww_rating_badge_copied() : ""}</span>
	</div>
	<pre class="code" aria-labelledby="badge-code-label"><code>{snippet}</code></pre>

	<p class="fine">{m.ww_rating_badge_updates()}</p>
	<a class="back" href={backHref}>{m.ww_rating_badge_back()}</a>
</section>

<style>
	.show {
		box-sizing: border-box;
		width: min(100%, 760px);
		margin: 0 auto;
		padding: clamp(28px, 6vh, 72px) var(--pad, 16px) clamp(40px, 8vh, 96px);
		display: flex;
		flex-direction: column;
		gap: 20px;
		font-family: var(--rt-font-web);
		color: var(--rtvr-on-dark);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.title {
		margin: 0;
		font-family: var(--rt-font-display);
		font-weight: normal;
		font-size: clamp(32px, 5vw, 52px);
		line-height: 1.05;
		color: var(--color-gold-shard);
	}

	.name {
		margin: 0;
		font-size: clamp(18px, 2.4vw, 24px);
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.lead {
		margin: 0;
		font-size: 16px;
		line-height: 1.5;
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 16px 32px;
	}

	.choice {
		margin: 0;
		padding: 0;
		border: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	legend {
		padding: 0;
		margin-bottom: 8px;
		font-size: 14px;
		color: var(--rt-fg-muted);
	}

	.pills {
		display: flex;
		border: 1px solid var(--color-gold-shard);
		border-radius: 12px;
		overflow: hidden;
	}

	.pill {
		position: relative;
		min-height: 44px;
		min-width: 88px;
		padding: 0 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 15px;
		cursor: pointer;
	}

	.pill + .pill {
		border-left: 1px solid var(--color-gold-shard);
	}

	.pill.on {
		background: var(--color-gold-shard);
		color: var(--rt-gold-ink);
		font-weight: 700;
	}

	.pill input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}

	.pill:has(input:focus-visible) {
		outline: 2px solid var(--rt-yellow);
		outline-offset: -3px;
	}

	.preview {
		display: grid;
		place-items: center;
		min-height: 180px;
		padding: 24px 16px;
		border-radius: 14px;
		background: var(--rt-fg);
		border: 1px solid var(--rt-bg-input-alt);
	}

	.preview.dark {
		background: var(--rt-input);
	}

	.preview a {
		display: block;
		max-width: 100%;
	}

	.preview img {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.code-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.code-label {
		font-size: 14px;
		color: var(--rt-fg-muted);
	}

	.copy {
		min-height: 44px;
		min-width: 104px;
		padding: 0 22px;
		border: none;
		border-radius: 12px;
		background: var(--rt-yellow);
		color: var(--rtvr-ink);
		font: inherit;
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}

	.copy:focus-visible {
		outline: 2px solid var(--rtvr-on-dark);
		outline-offset: 2px;
	}

	.spoken {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.code {
		margin: 0;
		padding: 16px;
		border-radius: 10px;
		border: 1px solid var(--rt-bg-input-alt);
		background: var(--rt-input);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		user-select: all;
	}

	.fine {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--rt-fg-muted);
	}

	.back {
		align-self: flex-start;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		color: var(--rtvr-on-dark);
		font-size: 15px;
		text-decoration: underline;
		text-decoration-color: var(--color-gold-bar);
		text-underline-offset: 4px;
	}
</style>
