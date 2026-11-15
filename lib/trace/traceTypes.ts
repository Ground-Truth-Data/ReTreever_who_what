/** The published run a trace is read from. */
export type TraceRun = { at: string };

/**
 * An org's published score as an overview, every figure from the published
 * run's frozen row. Scores are 0–100. `group` is the stakeholder category it
 * was ranked within, `"all"` when that group was too small, null when it has
 * none. It names how many projects the score averaged, never which.
 */
export type OrgTrace = {
	kind: "org";
	key: string;
	name: string;
	run: TraceRun | null;
	rating: number | null;
	rank: number | null;
	rankOf: number | null;
	group: string | null;
	/** True when a reviewed claim was weighed, so a ratio applies. */
	reviewed: boolean;
	score: number | null;
	/** The score before the ratio: its projects' weighted average. */
	fieldScore: number | null;
	ratio: number | null;
	projectsScored: number;
};

/** A project's published score as an overview: its place, then its points. */
export type ProjectTrace = {
	kind: "project";
	key: string;
	name: string;
	run: TraceRun | null;
	rating: number | null;
	rank: number | null;
	rankOf: number | null;
	score: number | null;
	pointsScored: number | null;
	pointsAvailable: number | null;
};

export type ScoreTrace = OrgTrace | ProjectTrace;

/** The method's sections a stop links to; the host maps each to a URL. */
export type MethodSection = "rating" | "orgScore" | "disclosure" | "orgProjects" | "projectScore";

export type TraceRoutes = {
	/** The record's own rating page. */
	rating: string;
	/** One section of the published method. Absent → no "how we work this out" links. */
	method?: (section: MethodSection) => string;
};
