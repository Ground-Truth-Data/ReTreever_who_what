import { m } from "$parent/src/lib/paraglide/messages";
import type { WeedsColumn } from "../whoWhatTypes";

// Keyed by the English label the host's /api/weeds sends: a column key like `parent` reads differently per table.
// A label missing here is drawn as sent.
const LABELS: Record<string, () => string> = {
	Project: m.ww_rating_column_project,
	Score: m.ww_rating_column_score,
	Points: m.ww_rating_column_points,
	"Trees planted": m.ww_rating_column_trees_planted,
	"Scored on": m.ww_rating_column_scored_on,
	Started: m.ww_rating_column_started,
	Ends: m.ww_rating_column_ends,
	"Last updated": m.ww_rating_column_last_updated,
	Description: m.ww_rating_column_description,
	Crop: m.ww_rating_column_crop,
	Species: m.ww_rating_column_species,
	"Seed source": m.ww_rating_column_seed_source,
	"Nursery stock": m.ww_rating_column_nursery_stock,
	"Trees planned": m.ww_rating_column_trees_planned,
	Units: m.ww_rating_column_units,
	Unit: m.ww_rating_column_unit,
	"Price per unit": m.ww_rating_column_price_per_unit,
	"Planted on": m.ww_rating_column_planted_on,
	Site: m.ww_rating_column_site,
	Hectares: m.ww_rating_column_hectares,
	Status: m.ww_rating_column_status,
	"Surviving (%)": m.ww_rating_column_surviving_pct,
	"Price per tree": m.ww_rating_column_price_per_tree,
	"People employed": m.ww_rating_column_people_employed,
	"Counted as": m.ww_rating_column_counted_as,
	"Restoration type": m.ww_rating_column_restoration_type,
	Treatment: m.ww_rating_column_treatment,
	"Degraded on": m.ww_rating_column_degraded_on,
	Reviews: m.ww_rating_column_reviews,
	Organization: m.ww_rating_column_organization,
	Role: m.ww_rating_column_role,
	Kind: m.ww_rating_column_kind,
	Link: m.ww_rating_column_link,
	"Published by": m.ww_rating_column_published_by,
	Credit: m.ww_rating_column_credit,
};

/** The header a reader sees for a weeds column. */
export function columnLabel(column: WeedsColumn): string {
	return Object.hasOwn(LABELS, column.label) ? LABELS[column.label]() : column.label;
}
