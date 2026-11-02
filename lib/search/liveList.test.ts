import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveList } from "./liveList.svelte";
import type { SearchListItem } from "./searchTypes";

const item = (key: string): SearchListItem => ({ key, name: key, rating: null });

afterEach(() => vi.useRealTimers());

describe("LiveList — the bar's words, asked of the server", () => {
	it("asks once typing pauses, with the last words only", async () => {
		vi.useFakeTimers();
		const load = vi.fn(async (q: string) => [item(q)]);
		const list = new LiveList(load);

		list.ask("m");
		list.ask("ma");
		list.ask("Man ");
		await vi.runAllTimersAsync();

		expect(load.mock.calls.map(([q]) => q)).toEqual(["man"]);
		expect(list.items).toEqual([item("man")]);
		expect(list.loading).toBe(false);
	});

	it("does not ask again for the words already on their way", async () => {
		const load = vi.fn(async (q: string) => [item(q)]);
		const list = new LiveList(load);

		const first = list.now("eden");
		const again = list.now(" Eden");

		expect(again).toBe(first);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("never paints a late answer to older words over newer ones", async () => {
		let release: (items: SearchListItem[]) => void = () => {};
		const slow = new Promise<SearchListItem[]>((r) => {
			release = r;
		});
		const list = new LiveList((q) => (q === "old" ? slow : Promise.resolve([item(q)])));

		void list.now("old");
		await list.now("new");
		release([item("old")]);
		await slow;

		expect(list.items).toEqual([item("new")]);
	});

	it("aborts the request for older words when newer ones are asked", async () => {
		const signals: AbortSignal[] = [];
		const list = new LiveList(async (q, signal) => {
			signals.push(signal);
			return [item(q)];
		});

		void list.now("old");
		await list.now("new");

		expect(signals.map((s) => s.aborted)).toEqual([true, false]);
	});
});
