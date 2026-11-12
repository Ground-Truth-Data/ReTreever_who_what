<script lang="ts">
import { tick } from "svelte";
import { FEEDBACK_ROLES, type FeedbackBody, type FeedbackRole } from "../whoWhatTypes";
import { m } from "$parent/src/lib/paraglide/messages";
import { getLocale } from "$parent/src/lib/paraglide/runtime";

let {
	href,
	address = undefined,
	about,
}: {
	/** The host's endpoint; the child posts only there and never holds a key. */
	href: string;
	address?: string;
	/** The record as the reader sees it at the moment of sending, lit tab included. */
	about: () => NonNullable<FeedbackBody["record"]>;
} = $props();

const MAX = 5000;
const ROLE_WORDS: Record<FeedbackRole, () => string> = {
	official: m.ww_rating_feedback_role_official,
	organization: m.ww_rating_feedback_role_organization,
	researcher: m.ww_rating_feedback_role_researcher,
	funder: m.ww_rating_feedback_role_funder,
	other: m.ww_rating_feedback_role_other,
};

let open = $state(false);
let sending = $state(false);
let sent = $state(false);
let message = $state("");
let email = $state("");
let role = $state<FeedbackRole | "">("");
let website = $state("");
// Why the last press did not work, under the button that was pressed; never a toast.
let note = $state<{ at: "send" | "copy"; text: string } | null>(null);
let failed = $state(false);
let box = $state<HTMLTextAreaElement | null>(null);

async function show() {
	open = true;
	await tick();
	box?.focus();
}

async function send(e: SubmitEvent) {
	e.preventDefault();
	if (!message.trim() || sending) return;
	sending = true;
	note = null;
	const body: FeedbackBody = {
		message,
		email: email.trim() || undefined,
		role: role || undefined,
		website,
		url: location.href,
		locale: getLocale(),
		record: about(),
	};
	try {
		const res = await fetch(href, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
		if (!res.ok) throw res.status;
		sent = true;
		failed = false;
	} catch (status) {
		console.error("[feedback] send failed", status);
		failed = true;
		note = { at: "send", text: status === 429 ? m.ww_rating_feedback_failed_busy() : m.ww_rating_feedback_failed() };
	} finally {
		sending = false;
	}
}

function again() {
	message = "";
	sent = false;
	note = null;
	failed = false;
	void show();
}

async function copy() {
	const record = about();
	const text = [
		address ? `To: ${address}` : null,
		`Subject: ReTreever feedback: ${record.name}`,
		"",
		message.trim(),
		"",
		location.href,
	]
		.filter((line) => line !== null)
		.join("\n");
	try {
		await navigator.clipboard.writeText(text);
		note = { at: "copy", text: address ? m.ww_rating_feedback_copied({ address }) : m.ww_rating_feedback_copied_plain() };
	} catch {
		note = { at: "copy", text: address ? m.ww_rating_feedback_copy_refused({ address }) : m.ww_rating_feedback_failed() };
	}
}
</script>

<section class="feedback" aria-label={m.ww_rating_feedback_label()}>
	{#if !open}
		<button type="button" class="opener" onclick={show}>
			{m.ww_rating_feedback_open()}
		</button>
	{:else if sent}
		<div class="done" role="status">
			<p class="thanks">{m.ww_rating_feedback_thanks()}</p>
			<button type="button" class="quiet" onclick={again}>{m.ww_rating_feedback_another()}</button>
		</div>
	{:else}
		<form class="form" onsubmit={send}>
			<label class="field">
				<span class="label">{m.ww_rating_feedback_message_label()}</span>
				<textarea bind:this={box} bind:value={message} rows="5" maxlength={MAX} required></textarea>
			</label>
			<p class="fine">{m.ww_rating_feedback_attached()}</p>
			<div class="row">
				<label class="field">
					<span class="label">{m.ww_rating_feedback_email_label()}</span>
					<input type="email" bind:value={email} autocomplete="email" maxlength="254" />
				</label>
				<label class="field">
					<span class="label">{m.ww_rating_feedback_role_label()}</span>
					<select bind:value={role}>
						<option value="">{m.ww_rating_feedback_role_none()}</option>
						{#each FEEDBACK_ROLES as r (r)}
							<option value={r}>{ROLE_WORDS[r]()}</option>
						{/each}
					</select>
				</label>
			</div>
			<!-- The honeypot: hidden from people and their keyboards; a form-filling bot fills it. -->
			<input class="trap" type="text" name="website" bind:value={website} tabindex="-1" autocomplete="off" aria-hidden="true" />
			<div class="actions">
				<button type="submit" class="send" disabled={!message.trim() || sending}>
					{sending ? m.ww_rating_feedback_sending() : m.ww_rating_feedback_send()}
				</button>
				<button type="button" class="quiet" onclick={() => (open = false)}>{m.ww_rating_feedback_close()}</button>
			</div>
			{#if note?.at === "send"}<p class="note" role="alert">{note.text}</p>{/if}
			{#if failed}
				<button type="button" class="quiet copy" onclick={copy}>{m.ww_rating_feedback_copy()}</button>
				{#if note?.at === "copy"}<p class="note" role="status">{note.text}</p>{/if}
			{/if}
		</form>
	{/if}
</section>

<style>
	.feedback {
		position: relative;
		box-sizing: border-box;
		width: min(100%, 720px);
		margin: 0 auto;
		padding: clamp(24px, 4vh, 48px) var(--pad, 16px) clamp(40px, 7vh, 88px);
		font-family: var(--rt-font-web);
		color: var(--rtvr-on-dark);
	}

	.opener,
	.quiet {
		padding: 10px 0;
		min-height: 44px;
		background: none;
		border: none;
		color: var(--rtvr-on-dark);
		font: inherit;
		font-size: 15px;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: var(--color-gold-bar);
		text-underline-offset: 4px;
		cursor: pointer;
	}

	.opener {
		display: block;
		margin: 0 auto;
		text-align: center;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.label {
		font-size: 14px;
	}

	textarea,
	input,
	select {
		box-sizing: border-box;
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid #8d93a6;
		border-radius: 10px;
		background: rgb(11 17 9 / 0.85);
		color: var(--rtvr-on-dark);
		font: inherit;
		font-size: 16px;
	}

	textarea {
		resize: vertical;
		min-height: 8rem;
	}

	textarea:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--rt-yellow);
		outline-offset: 1px;
	}

	.fine,
	.note {
		margin: 0;
		font-size: 14px;
		color: #8d93a6;
	}

	.note {
		color: var(--rt-yellow);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.send {
		min-height: 44px;
		padding: 0 28px;
		border: none;
		border-radius: 12px;
		background: var(--rt-yellow);
		color: var(--rtvr-ink);
		font: inherit;
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}

	.send:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.copy {
		align-self: flex-start;
	}

	.done {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		text-align: center;
	}

	.thanks {
		margin: 0;
		font-size: 17px;
		color: var(--rt-yellow);
	}

	.trap {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
</style>
