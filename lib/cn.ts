// ⚠️ Copied on purpose, not shared — a child must never import up into ReTreever (childBoundary.test.ts forbids it). ReTreever's identical copy at src/lib/core/utils.ts is not drift.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
