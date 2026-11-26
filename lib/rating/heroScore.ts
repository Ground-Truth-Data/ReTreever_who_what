import { m } from "$parent/src/lib/paraglide/messages";

/** The big number on a rating page: the 0–100 score rounded whole, so 99.6 is "100". Everywhere else keeps its decimal. */
export const heroScore = (rating: number): string => String(Math.round(rating));

/** "72 out of 100", as the hero's number is heard. */
export const heroScoreOutOf = (rating: number): string => m.ww_rating_out_of({ rating: heroScore(rating) });

/** Zeros as wide as the hero's number, holding its place until the dog brings it. */
export const heroGhost = (rating: number): string => "0".repeat(heroScore(rating).length);
