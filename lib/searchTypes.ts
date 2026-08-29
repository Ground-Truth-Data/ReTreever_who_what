export interface SearchListItem {
	/** Stable identifier (organizationKey / projectKey). */
	key: string;
	/** Display name, and what a selection writes into the query field. */
	name: string;
	/** Secondary line, e.g. an org's primaryStakeholderCategory. */
	hint?: string | null;
}
