import { normalizeQuery } from "./searchResolve";
import type { SearchListItem } from "./searchTypes";

const TYPING_PAUSE_MS = 200;

/** One tab's list as the server answers the bar's words: the API caps a key-less list, so the bar asks again as the words change. */
export class LiveList {
	items = $state<SearchListItem[]>([]);
	loading = $state(false);

	#load: (query: string) => Promise<SearchListItem[]>;
	#asked: string | null = null;
	#answer: Promise<SearchListItem[]> = Promise.resolve([]);
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(load: (query: string) => Promise<SearchListItem[]>) {
		this.#load = load;
	}

	/** Asks once typing pauses. */
	ask(query: string): void {
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.now(query), TYPING_PAUSE_MS);
	}

	/** The list for exactly these words, asked now unless it is the answer already on its way. */
	now(query: string): Promise<SearchListItem[]> {
		clearTimeout(this.#timer);
		const q = normalizeQuery(query);
		if (q === this.#asked) return this.#answer;
		this.#asked = q;
		this.loading = true;
		const answer = this.#load(q);
		this.#answer = answer;
		// The loaders never reject. A late answer to older words is dropped, not painted over newer ones.
		void answer.then((items) => {
			if (this.#answer !== answer) return;
			this.items = items;
			this.loading = false;
		});
		return answer;
	}
}
